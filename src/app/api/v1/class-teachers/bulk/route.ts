import { z } from "zod";

import { recordAuditLog } from "@/lib/audit";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

const MAX_ROWS = 500;

const rowSchema = z.object({
  employeeId: z.string().trim().min(1),
  academicYear: z.string().trim().min(1),
  className: z.string().trim().min(1),
  section: z.string().trim().min(1),
  active: z.boolean().default(true),
  remarks: z.string().trim().max(500).nullable().optional(),
});

const bodySchema = z.object({
  assignments: z.array(rowSchema).min(1).max(MAX_ROWS),
});

type RowError = { row: number; message: string };

type ResolvedAssignment = z.infer<typeof rowSchema> & {
  row: number;
  teacherId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function assignmentKey(input: {
  academicYearId: string;
  classId: string;
  sectionId: string;
}) {
  return `${input.academicYearId}|${input.classId}|${input.sectionId}`;
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const { assignments } = bodySchema.parse(await req.json());

    const [teachers, academicYears, classes] = await Promise.all([
      prisma.teacher.findMany({
        where: { schoolId: tenant.schoolId, active: true },
        select: { id: true, employeeId: true, fullName: true },
      }),
      prisma.academicYear.findMany({
        where: { schoolId: tenant.schoolId },
        select: { id: true, name: true },
      }),
      prisma.class.findMany({
        where: { schoolId: tenant.schoolId, active: true },
        select: {
          id: true,
          name: true,
          sections: {
            where: { active: true },
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    const teacherMap = new Map(
      teachers.map((teacher) => [normalize(teacher.employeeId), teacher]),
    );
    const academicYearMap = new Map(
      academicYears.map((year) => [normalize(year.name), year]),
    );
    const classMap = new Map(
      classes.map((schoolClass) => [normalize(schoolClass.name), schoolClass]),
    );

    const errors: RowError[] = [];
    const resolved: ResolvedAssignment[] = [];
    const importKeys = new Set<string>();

    assignments.forEach((assignment, index) => {
      const row = index + 2;
      const teacher = teacherMap.get(normalize(assignment.employeeId));
      const academicYear = academicYearMap.get(
        normalize(assignment.academicYear),
      );
      const schoolClass = classMap.get(normalize(assignment.className));
      const section = schoolClass?.sections.find(
        (item) => normalize(item.name) === normalize(assignment.section),
      );

      if (!teacher) {
        errors.push({
          row,
          message: `Active teacher not found for employee ID: ${assignment.employeeId}`,
        });
        return;
      }
      if (!academicYear) {
        errors.push({
          row,
          message: `Academic year not found: ${assignment.academicYear}`,
        });
        return;
      }
      if (!schoolClass) {
        errors.push({
          row,
          message: `Active class not found: ${assignment.className}`,
        });
        return;
      }
      if (!section) {
        errors.push({
          row,
          message: `Active section ${assignment.section} was not found in ${assignment.className}.`,
        });
        return;
      }

      const key = assignmentKey({
        academicYearId: academicYear.id,
        classId: schoolClass.id,
        sectionId: section.id,
      });
      if (importKeys.has(key)) {
        errors.push({
          row,
          message:
            "Duplicate class and section assignment for this academic year in the import batch.",
        });
        return;
      }

      importKeys.add(key);
      resolved.push({
        ...assignment,
        row,
        teacherId: teacher.id,
        academicYearId: academicYear.id,
        classId: schoolClass.id,
        sectionId: section.id,
      });
    });

    if (errors.length > 0) {
      return ApiResponse.success(
        {
          created: 0,
          skipped: 0,
          failed: errors.length,
          errors,
          skippedRows: [],
        },
        "Validation failed. No class teachers from this batch were imported.",
      );
    }

    const existing = await prisma.classTeacherAssignment.findMany({
      where: {
        schoolId: tenant.schoolId,
        OR: resolved.map((item) => ({
          academicYearId: item.academicYearId,
          classId: item.classId,
          sectionId: item.sectionId,
        })),
      },
      select: {
        academicYearId: true,
        classId: true,
        sectionId: true,
        teacher: { select: { employeeId: true, fullName: true } },
      },
    });

    const existingMap = new Map(
      existing.map((item) => [assignmentKey(item), item.teacher]),
    );
    const skippedRows: Array<
      RowError & {
        employeeId: string;
        academicYear: string;
        className: string;
        section: string;
      }
    > = [];
    const toCreate: ResolvedAssignment[] = [];

    for (const item of resolved) {
      const existingTeacher = existingMap.get(assignmentKey(item));
      if (existingTeacher) {
        skippedRows.push({
          row: item.row,
          employeeId: item.employeeId,
          academicYear: item.academicYear,
          className: item.className,
          section: item.section,
          message:
            normalize(existingTeacher.employeeId) === normalize(item.employeeId)
              ? "This class teacher assignment already exists."
              : `Already assigned to ${existingTeacher.fullName} (${existingTeacher.employeeId}).`,
        });
        continue;
      }
      toCreate.push(item);
    }

    let created = 0;
    if (toCreate.length > 0) {
      const result = await prisma.classTeacherAssignment.createMany({
        data: toCreate.map((item) => ({
          schoolId: tenant.schoolId,
          academicYearId: item.academicYearId,
          teacherId: item.teacherId,
          classId: item.classId,
          sectionId: item.sectionId,
          active: item.active,
          remarks: item.remarks || null,
        })),
        skipDuplicates: true,
      });
      created = result.count;
    }

    if (created > 0) {
      await recordAuditLog({
        actor: tenant,
        module: "ACADEMICS",
        action: "IMPORT",
        entityType: "CLASS_TEACHER_ASSIGNMENT",
        summary: `Imported ${created} class teacher assignment${created === 1 ? "" : "s"}.`,
        metadata: { created, skipped: skippedRows.length },
      });
    }

    const skipped = skippedRows.length;
    const message =
      created === 0 && skipped > 0
        ? `No new class teachers were imported. ${skipped} existing assignment${skipped === 1 ? " was" : "s were"} skipped.`
        : `${created} class teacher assignment${created === 1 ? "" : "s"} imported${skipped > 0 ? `; ${skipped} existing assignment${skipped === 1 ? " was" : "s were"} skipped` : " successfully"}.`;

    return ApiResponse.success(
      {
        created,
        skipped,
        failed: 0,
        errors: [],
        skippedRows,
      },
      message,
    );
  });
}
