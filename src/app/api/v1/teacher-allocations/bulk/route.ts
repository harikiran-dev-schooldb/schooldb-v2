import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";

const MAX_ROWS = 500;

type AllocationInput = {
  employeeId: string;
  academicYear: string;
  subject: string;
  className: string;
  section: string;
  active?: boolean;
  remarks?: string | null;
};

type RowError = { row: number; message: string };

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = (await req.json()) as { allocations?: AllocationInput[] };
    const allocations = Array.isArray(body.allocations) ? body.allocations : [];

    if (!allocations.length)
      throw new Error("No teacher allocations were provided.");
    if (allocations.length > MAX_ROWS)
      throw new Error(`Maximum ${MAX_ROWS} allocations per import.`);

    const errors: RowError[] = [];
    const resolved: Array<{
      row: number;
      teacherId: string;
      academicYearId: string;
      subjectId: string;
      classId: string;
      sectionId: string;
      active: boolean;
      remarks: string | null;
    }> = [];

    const teacherIds = [
      ...new Set(allocations.map((a) => a.employeeId.trim()).filter(Boolean)),
    ];
    const yearNames = [
      ...new Set(allocations.map((a) => a.academicYear.trim()).filter(Boolean)),
    ];
    const subjectNames = [
      ...new Set(allocations.map((a) => a.subject.trim()).filter(Boolean)),
    ];
    const classNames = [
      ...new Set(allocations.map((a) => a.className.trim()).filter(Boolean)),
    ];

    const [teachers, years, subjects, classes] = await Promise.all([
      prisma.teacher.findMany({
        where: { schoolId: tenant.schoolId, employeeId: { in: teacherIds } },
        select: { id: true, employeeId: true },
      }),
      prisma.academicYear.findMany({
        where: { schoolId: tenant.schoolId, name: { in: yearNames } },
        select: { id: true, name: true },
      }),
      prisma.subject.findMany({
        where: { schoolId: tenant.schoolId, name: { in: subjectNames } },
        select: { id: true, name: true },
      }),
      prisma.class.findMany({
        where: { schoolId: tenant.schoolId, name: { in: classNames } },
        select: {
          id: true,
          name: true,
          sections: { select: { id: true, name: true } },
        },
      }),
    ]);

    const teacherMap = new Map(
      teachers.map((t) => [t.employeeId.trim().toLowerCase(), t.id]),
    );
    const yearMap = new Map(
      years.map((y) => [y.name.trim().toLowerCase(), y.id]),
    );
    const subjectMap = new Map(
      subjects.map((s) => [s.name.trim().toLowerCase(), s.id]),
    );
    const classMap = new Map(
      classes.map((c) => [c.name.trim().toLowerCase(), c]),
    );

    const keys = new Set<string>();
    for (let index = 0; index < allocations.length; index += 1) {
      const item = allocations[index];
      const row = index + 2;
      const teacherId = teacherMap.get(item.employeeId.trim().toLowerCase());
      const academicYearId = yearMap.get(
        item.academicYear.trim().toLowerCase(),
      );
      const subjectId = subjectMap.get(item.subject.trim().toLowerCase());
      const classRecord = classMap.get(item.className.trim().toLowerCase());

      if (!teacherId) {
        errors.push({
          row,
          message: `Teacher not found for employee ID: ${item.employeeId}`,
        });
        continue;
      }
      if (!academicYearId) {
        errors.push({
          row,
          message: `Academic year not found: ${item.academicYear}`,
        });
        continue;
      }
      if (!subjectId) {
        errors.push({ row, message: `Subject not found: ${item.subject}` });
        continue;
      }
      if (!classRecord) {
        errors.push({ row, message: `Class not found: ${item.className}` });
        continue;
      }

      const section = classRecord.sections.find(
        (s) =>
          s.name.trim().toLowerCase() === item.section.trim().toLowerCase(),
      );
      if (!section) {
        errors.push({
          row,
          message: `Section ${item.section} was not found in ${item.className}.`,
        });
        continue;
      }

      const key = [
        academicYearId,
        teacherId,
        subjectId,
        classRecord.id,
        section.id,
      ].join("|");
      if (keys.has(key)) {
        errors.push({
          row,
          message: "Duplicate teacher allocation in this import.",
        });
        continue;
      }
      keys.add(key);
      resolved.push({
        row,
        teacherId,
        academicYearId,
        subjectId,
        classId: classRecord.id,
        sectionId: section.id,
        active: item.active !== false,
        remarks: item.remarks?.trim() || null,
      });
    }

    if (errors.length)
      return ApiResponse.success(
        { created: 0, failed: errors.length, errors },
        "Validation failed. No allocations were imported.",
      );

    const existing = await prisma.teacherAllocation.findMany({
      where: {
        schoolId: tenant.schoolId,
        OR: resolved.map((r) => ({
          academicYearId: r.academicYearId,
          teacherId: r.teacherId,
          subjectId: r.subjectId,
          classId: r.classId,
          sectionId: r.sectionId,
        })),
      },
      select: {
        academicYearId: true,
        teacherId: true,
        subjectId: true,
        classId: true,
        sectionId: true,
      },
    });
    if (existing.length)
      throw new Error(
        "One or more teacher allocations already exist for the selected combinations.",
      );

    await prisma.$transaction(
      resolved.map((r) =>
        prisma.teacherAllocation.create({
          data: {
            schoolId: tenant.schoolId,
            academicYearId: r.academicYearId,
            teacherId: r.teacherId,
            subjectId: r.subjectId,
            classId: r.classId,
            sectionId: r.sectionId,
            active: r.active,
            remarks: r.remarks,
          },
        }),
      ),
    );

    return ApiResponse.success(
      { created: resolved.length, failed: 0, errors: [] },
      "Teacher allocations imported successfully.",
    );
  });
}
