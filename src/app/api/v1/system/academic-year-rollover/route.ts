import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

const inputSchema = z.object({ sourceAcademicYearId: z.string().min(1), targetAcademicYearId: z.string().min(1) }).refine((v) => v.sourceAcademicYearId !== v.targetAcademicYearId, "Choose two different academic years.");

async function context(schoolId: string, sourceId: string, targetId: string) {
  const years = await prisma.academicYear.findMany({ where: { schoolId, id: { in: [sourceId, targetId] } }, select: { id: true, name: true, startDate: true } });
  if (years.length !== 2) return null;
  const source = years.find((year) => year.id === sourceId)!;
  const target = years.find((year) => year.id === targetId)!;
  const [classSubjects, allocations, classTeachers, timetable, feePlans, periods] = await Promise.all([
    prisma.classSubject.count({ where: { schoolId, academicYearId: sourceId, active: true } }),
    prisma.teacherAllocation.count({ where: { schoolId, academicYearId: sourceId, active: true } }),
    prisma.classTeacherAssignment.count({ where: { schoolId, academicYearId: sourceId, active: true } }),
    prisma.timetable.count({ where: { schoolId, academicYearId: sourceId, active: true } }),
    prisma.feePlan.count({ where: { schoolId, academicYearId: sourceId, active: true } }),
    prisma.period.count({ where: { schoolId, active: true } }),
  ]);
  return { source, target, counts: { classSubjects, allocations, classTeachers, timetable, feePlans, periods } };
}

export async function GET(request: Request) {
  return apiHandler(async () => {
    const member = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const url = new URL(request.url);
    const parsed = inputSchema.safeParse({ sourceAcademicYearId: url.searchParams.get("sourceAcademicYearId"), targetAcademicYearId: url.searchParams.get("targetAcademicYearId") });
    if (!parsed.success) return ApiResponse.error(parsed.error.issues[0]?.message ?? "Select source and target years.", 400);
    const result = await context(member.schoolId, parsed.data.sourceAcademicYearId, parsed.data.targetAcademicYearId);
    return result ? ApiResponse.success(result) : ApiResponse.error("Academic year not found.", 404);
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const member = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const input = inputSchema.parse(await request.json());
    const info = await context(member.schoolId, input.sourceAcademicYearId, input.targetAcademicYearId);
    if (!info) return ApiResponse.error("Academic year not found.", 404);
    const shiftMs = info.target.startDate.getTime() - info.source.startDate.getTime();
    const shift = (date: Date | null) => date ? new Date(date.getTime() + shiftMs) : null;
    const summary = await prisma.$transaction(async (tx) => {
      const result = { classSubjects: 0, allocations: 0, classTeachers: 0, timetable: 0, feePlans: 0, periodsReused: info.counts.periods };
      const subjects = await tx.classSubject.findMany({ where: { schoolId: member.schoolId, academicYearId: info.source.id, active: true } });
      for (const row of subjects) {
        const exists = await tx.classSubject.findUnique({ where: { academicYearId_classId_subjectId: { academicYearId: info.target.id, classId: row.classId, subjectId: row.subjectId } } });
        if (!exists) { await tx.classSubject.create({ data: { schoolId: member.schoolId, academicYearId: info.target.id, classId: row.classId, subjectId: row.subjectId, active: row.active } }); result.classSubjects++; }
      }
      const allocations = await tx.teacherAllocation.findMany({ where: { schoolId: member.schoolId, academicYearId: info.source.id, active: true } });
      const allocationMap = new Map<string, string>();
      for (const row of allocations) {
        const key = { schoolId_academicYearId_teacherId_subjectId_classId_sectionId: { schoolId: member.schoolId, academicYearId: info.target.id, teacherId: row.teacherId, subjectId: row.subjectId, classId: row.classId, sectionId: row.sectionId } };
        let target = await tx.teacherAllocation.findUnique({ where: key });
        if (!target) { target = await tx.teacherAllocation.create({ data: { schoolId: member.schoolId, academicYearId: info.target.id, teacherId: row.teacherId, subjectId: row.subjectId, classId: row.classId, sectionId: row.sectionId, active: row.active, remarks: row.remarks } }); result.allocations++; }
        allocationMap.set(row.id, target.id);
      }
      const teachers = await tx.classTeacherAssignment.findMany({ where: { schoolId: member.schoolId, academicYearId: info.source.id, active: true } });
      for (const row of teachers) {
        const key = { schoolId_academicYearId_classId_sectionId: { schoolId: member.schoolId, academicYearId: info.target.id, classId: row.classId, sectionId: row.sectionId } };
        if (!await tx.classTeacherAssignment.findUnique({ where: key })) { await tx.classTeacherAssignment.create({ data: { schoolId: member.schoolId, academicYearId: info.target.id, teacherId: row.teacherId, classId: row.classId, sectionId: row.sectionId, active: row.active, remarks: row.remarks } }); result.classTeachers++; }
      }
      const slots = await tx.timetable.findMany({ where: { schoolId: member.schoolId, academicYearId: info.source.id, active: true } });
      for (const row of slots) {
        const allocationId = allocationMap.get(row.teacherAllocationId); if (!allocationId) continue;
        const key = { academicYearId_day_periodId_teacherAllocationId: { academicYearId: info.target.id, day: row.day, periodId: row.periodId, teacherAllocationId: allocationId } };
        if (!await tx.timetable.findUnique({ where: key })) { await tx.timetable.create({ data: { schoolId: member.schoolId, academicYearId: info.target.id, teacherAllocationId: allocationId, periodId: row.periodId, day: row.day, active: row.active } }); result.timetable++; }
      }
      const plans = await tx.feePlan.findMany({ where: { schoolId: member.schoolId, academicYearId: info.source.id, active: true }, include: { classes: true, items: { include: { installments: true, customInstallments: true } } } });
      for (const plan of plans) {
        if (await tx.feePlan.findUnique({ where: { schoolId_academicYearId_name: { schoolId: member.schoolId, academicYearId: info.target.id, name: plan.name } } })) continue;
        await tx.feePlan.create({ data: { schoolId: member.schoolId, academicYearId: info.target.id, name: plan.name, description: plan.description, active: plan.active, appliesToAllClasses: plan.appliesToAllClasses, classes: { create: plan.classes.map((c) => ({ classId: c.classId })) }, items: { create: plan.items.map((item) => ({ feeCategoryId: item.feeCategoryId, frequency: item.frequency, amount: item.amount, mandatory: item.mandatory, installments: { create: item.installments.map((i) => ({ academicPeriodId: null, name: i.name, amount: i.amount, dueDate: shift(i.dueDate)!, sequence: i.sequence, periodStart: shift(i.periodStart), periodEnd: shift(i.periodEnd) })) }, customInstallments: { create: item.customInstallments.map((i) => ({ name: i.name, amount: i.amount, dueDate: shift(i.dueDate)!, sequence: i.sequence, periodStart: shift(i.periodStart), periodEnd: shift(i.periodEnd) })) } })) } } });
        result.feePlans++;
      }
      return result;
    }, { timeout: 30_000 });
    await recordAuditLog({ actor: member, module: "SYSTEM", action: "IMPORT", entityType: "ACADEMIC_YEAR_ROLLOVER", entityId: info.target.id, summary: `Rolled ${info.source.name} setup into ${info.target.name}.`, metadata: summary });
    return ApiResponse.success({ ...info, created: summary }, "Academic-year rollover completed.");
  });
}
