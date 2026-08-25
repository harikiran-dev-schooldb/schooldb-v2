import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";

const MAX_ROWS = 500;
const VALID_DAYS = new Set(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]);

type ImportRow = {
  academicYear: string;
  employeeId: string;
  subject: string;
  className: string;
  section: string;
  period: string;
  day: string;
  active?: boolean;
};

type RowError = { row: number; message: string };

const normalize = (value: string) => value.trim().toLowerCase();

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    const body = (await request.json()) as { timetables?: unknown };
    const input = Array.isArray(body.timetables) ? body.timetables : [];

    if (!input.length) throw new Error("No timetable rows were provided.");
    if (input.length > MAX_ROWS) throw new Error(`Maximum ${MAX_ROWS} timetable rows per import.`);

    const rows = input as ImportRow[];
    const errors: RowError[] = [];
    const seen = new Set<string>();

    const yearNames = [...new Set(rows.map((r) => r.academicYear?.trim()).filter(Boolean))];
    const employeeIds = [...new Set(rows.map((r) => r.employeeId?.trim()).filter(Boolean))];
    const subjectNames = [...new Set(rows.map((r) => r.subject?.trim()).filter(Boolean))];
    const classNames = [...new Set(rows.map((r) => r.className?.trim()).filter(Boolean))];
    const periodNames = [...new Set(rows.map((r) => r.period?.trim()).filter(Boolean))];

    const [years, teachers, subjects, classes, periods] = await Promise.all([
      prisma.academicYear.findMany({ where: { schoolId: tenant.schoolId, name: { in: yearNames } }, select: { id: true, name: true } }),
      prisma.teacher.findMany({ where: { schoolId: tenant.schoolId, employeeId: { in: employeeIds } }, select: { id: true, employeeId: true } }),
      prisma.subject.findMany({ where: { schoolId: tenant.schoolId, name: { in: subjectNames } }, select: { id: true, name: true } }),
      prisma.class.findMany({ where: { schoolId: tenant.schoolId, name: { in: classNames } }, select: { id: true, name: true, sections: { select: { id: true, name: true } } } }),
      prisma.period.findMany({ where: { schoolId: tenant.schoolId, name: { in: periodNames } }, select: { id: true, name: true } }),
    ]);

    const yearMap = new Map(years.map((v) => [normalize(v.name), v]));
    const teacherMap = new Map(teachers.map((v) => [normalize(v.employeeId), v]));
    const subjectMap = new Map(subjects.map((v) => [normalize(v.name), v]));
    const classMap = new Map(classes.map((v) => [normalize(v.name), v]));
    const periodMap = new Map(periods.map((v) => [normalize(v.name), v]));

    const resolved: Array<{ row: number; academicYearId: string; teacherAllocationId: string; periodId: string; day: string; active: boolean }> = [];

    for (let index = 0; index < rows.length; index += 1) {
      const item = rows[index];
      const row = index + 2;
      const year = yearMap.get(normalize(item.academicYear || ""));
      const teacher = teacherMap.get(normalize(item.employeeId || ""));
      const subject = subjectMap.get(normalize(item.subject || ""));
      const classRecord = classMap.get(normalize(item.className || ""));
      const period = periodMap.get(normalize(item.period || ""));
      const day = (item.day || "").trim().toUpperCase();

      if (!year) { errors.push({ row, message: `Academic year not found: ${item.academicYear}` }); continue; }
      if (!teacher) { errors.push({ row, message: `Teacher not found for employee ID: ${item.employeeId}` }); continue; }
      if (!subject) { errors.push({ row, message: `Subject not found: ${item.subject}` }); continue; }
      if (!classRecord) { errors.push({ row, message: `Class not found: ${item.className}` }); continue; }
      if (!period) { errors.push({ row, message: `Period not found: ${item.period}` }); continue; }
      if (!VALID_DAYS.has(day)) { errors.push({ row, message: "Day must be MONDAY through SATURDAY." }); continue; }

      const section = classRecord.sections.find((s) => normalize(s.name) === normalize(item.section || ""));
      if (!section) { errors.push({ row, message: `Section ${item.section} was not found in ${item.className}.` }); continue; }

      const allocation = await prisma.teacherAllocation.findFirst({
        where: { schoolId: tenant.schoolId, academicYearId: year.id, teacherId: teacher.id, subjectId: subject.id, classId: classRecord.id, sectionId: section.id },
        select: { id: true, active: true },
      });
      if (!allocation) { errors.push({ row, message: "Teacher allocation not found for this academic year, teacher, subject, class and section." }); continue; }
      if (!allocation.active) { errors.push({ row, message: "Teacher allocation is inactive." }); continue; }

      const key = [year.id, allocation.id, period.id, day].join("|");
      if (seen.has(key)) { errors.push({ row, message: "Duplicate timetable entry in this import." }); continue; }
      seen.add(key);
      resolved.push({ row, academicYearId: year.id, teacherAllocationId: allocation.id, periodId: period.id, day, active: item.active !== false });
    }

    if (errors.length) {
      return ApiResponse.success({ created: 0, failed: errors.length, errors }, "Validation failed. No timetable rows were imported.");
    }

    const [existingTeacher, existingClass] = await Promise.all([
      prisma.timetable.findMany({ where: { schoolId: tenant.schoolId, OR: resolved.map((r) => ({ academicYearId: r.academicYearId, teacherAllocationId: r.teacherAllocationId, periodId: r.periodId, day: r.day as never })) }, select: { id: true } }),
      prisma.timetable.findMany({ where: { schoolId: tenant.schoolId, OR: resolved.map((r) => ({ academicYearId: r.academicYearId, periodId: r.periodId, day: r.day as never, teacherAllocation: { classId: { in: [] } } })) }, select: { id: true } }),
    ]);

    if (existingTeacher.length || existingClass.length) {
      throw new Error("One or more timetable entries already exist. Review the CSV and import only new entries.");
    }

    for (const item of resolved) {
      const allocation = await prisma.teacherAllocation.findUnique({ where: { id: item.teacherAllocationId }, select: { teacherId: true, classId: true, sectionId: true } });
      if (!allocation) throw new Error(`Row ${item.row}: Teacher allocation no longer exists.`);

      const teacherConflict = await prisma.timetable.findFirst({ where: { schoolId: tenant.schoolId, academicYearId: item.academicYearId, periodId: item.periodId, day: item.day as never, teacherAllocation: { teacherId: allocation.teacherId } }, select: { id: true } });
      if (teacherConflict) throw new Error(`Row ${item.row}: Teacher already has another class during this period.`);

      const classConflict = await prisma.timetable.findFirst({ where: { schoolId: tenant.schoolId, academicYearId: item.academicYearId, periodId: item.periodId, day: item.day as never, teacherAllocation: { classId: allocation.classId, sectionId: allocation.sectionId } }, select: { id: true } });
      if (classConflict) throw new Error(`Row ${item.row}: Class already has another subject during this period.`);
    }

    await prisma.$transaction(resolved.map((item) => prisma.timetable.create({ data: { schoolId: tenant.schoolId, academicYearId: item.academicYearId, teacherAllocationId: item.teacherAllocationId, periodId: item.periodId, day: item.day as never, active: item.active } })));

    return ApiResponse.success({ created: resolved.length, failed: 0, errors: [] }, "Timetable imported successfully.");
  });
}
