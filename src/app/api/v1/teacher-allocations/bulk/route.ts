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

type RowError = {
  row: number;
  message: string;
};

type ResolvedAllocation = {
  row: number;
  employeeId: string;
  academicYear: string;
  subject: string;
  className: string;
  section: string;

  teacherId: string;
  academicYearId: string;
  subjectId: string;
  classId: string;
  sectionId: string;

  active: boolean;
  remarks: string | null;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function allocationKey(input: {
  academicYearId: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  sectionId: string;
}) {
  return [
    input.academicYearId,
    input.teacherId,
    input.subjectId,
    input.classId,
    input.sectionId,
  ].join("|");
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);

    const body = (await req.json()) as {
      allocations?: AllocationInput[];
    };

    const allocations = Array.isArray(body.allocations) ? body.allocations : [];

    /*
     * -------------------------------------------------------
     * Basic batch validation
     * -------------------------------------------------------
     */

    if (!allocations.length) {
      throw new Error("No teacher allocations were provided.");
    }

    if (allocations.length > MAX_ROWS) {
      throw new Error(
        `Maximum ${MAX_ROWS} allocations per batch. ` +
          `Split larger imports into batches of ${MAX_ROWS}.`,
      );
    }

    const errors: RowError[] = [];
    const resolved: ResolvedAllocation[] = [];

    /*
     * -------------------------------------------------------
     * Collect unique lookup values
     * -------------------------------------------------------
     */

    const teacherIds = [
      ...new Set(
        allocations.map((item) => item.employeeId?.trim()).filter(Boolean),
      ),
    ];

    const yearNames = [
      ...new Set(
        allocations.map((item) => item.academicYear?.trim()).filter(Boolean),
      ),
    ];

    const subjectNames = [
      ...new Set(
        allocations.map((item) => item.subject?.trim()).filter(Boolean),
      ),
    ];

    const classNames = [
      ...new Set(
        allocations.map((item) => item.className?.trim()).filter(Boolean),
      ),
    ];

    /*
     * -------------------------------------------------------
     * Load master records
     * -------------------------------------------------------
     */

    const [teachers, years, subjects, classes] = await Promise.all([
      prisma.teacher.findMany({
        where: {
          schoolId: tenant.schoolId,
          employeeId: {
            in: teacherIds,
          },
        },
        select: {
          id: true,
          employeeId: true,
        },
      }),

      prisma.academicYear.findMany({
        where: {
          schoolId: tenant.schoolId,
          name: {
            in: yearNames,
          },
        },
        select: {
          id: true,
          name: true,
        },
      }),

      prisma.subject.findMany({
        where: {
          schoolId: tenant.schoolId,
          name: {
            in: subjectNames,
          },
        },
        select: {
          id: true,
          name: true,
        },
      }),

      prisma.class.findMany({
        where: {
          schoolId: tenant.schoolId,
          name: {
            in: classNames,
          },
        },
        select: {
          id: true,
          name: true,
          sections: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    /*
     * -------------------------------------------------------
     * Build lookup maps
     * -------------------------------------------------------
     */

    const teacherMap = new Map(
      teachers.map((teacher) => [normalize(teacher.employeeId), teacher.id]),
    );

    const yearMap = new Map(
      years.map((year) => [normalize(year.name), year.id]),
    );

    const subjectMap = new Map(
      subjects.map((subject) => [normalize(subject.name), subject.id]),
    );

    const classMap = new Map(
      classes.map((classRecord) => [normalize(classRecord.name), classRecord]),
    );

    /*
     * -------------------------------------------------------
     * Resolve every row
     *
     * The API receives at most 500 rows at a time.
     * Row numbers are relative to this batch.
     * -------------------------------------------------------
     */

    const importKeys = new Set<string>();

    for (let index = 0; index < allocations.length; index += 1) {
      const item = allocations[index];
      const row = index + 2;

      const employeeId = item.employeeId?.trim() ?? "";
      const academicYear = item.academicYear?.trim() ?? "";
      const subject = item.subject?.trim() ?? "";
      const className = item.className?.trim() ?? "";
      const sectionName = item.section?.trim() ?? "";

      /*
       * Required values
       */

      if (!employeeId) {
        errors.push({
          row,
          message: "Employee ID is required.",
        });
        continue;
      }

      if (!academicYear) {
        errors.push({
          row,
          message: "Academic year is required.",
        });
        continue;
      }

      if (!subject) {
        errors.push({
          row,
          message: "Subject is required.",
        });
        continue;
      }

      if (!className) {
        errors.push({
          row,
          message: "Class is required.",
        });
        continue;
      }

      if (!sectionName) {
        errors.push({
          row,
          message: "Section is required.",
        });
        continue;
      }

      /*
       * Resolve teacher
       */

      const teacherId = teacherMap.get(normalize(employeeId));

      if (!teacherId) {
        errors.push({
          row,
          message: `Teacher not found for employee ID: ${employeeId}`,
        });
        continue;
      }

      /*
       * Resolve academic year
       */

      const academicYearId = yearMap.get(normalize(academicYear));

      if (!academicYearId) {
        errors.push({
          row,
          message: `Academic year not found: ${academicYear}`,
        });
        continue;
      }

      /*
       * Resolve subject
       */

      const subjectId = subjectMap.get(normalize(subject));

      if (!subjectId) {
        errors.push({
          row,
          message: `Subject not found: ${subject}`,
        });
        continue;
      }

      /*
       * Resolve class
       */

      const classRecord = classMap.get(normalize(className));

      if (!classRecord) {
        errors.push({
          row,
          message: `Class not found: ${className}`,
        });
        continue;
      }

      /*
       * Resolve section
       */

      const section = classRecord.sections.find(
        (sectionRecord) =>
          normalize(sectionRecord.name) === normalize(sectionName),
      );

      if (!section) {
        errors.push({
          row,
          message: `Section ${sectionName} was not found ` + `in ${className}.`,
        });
        continue;
      }

      /*
       * Detect duplicate rows inside this batch.
       *
       * active is intentionally NOT part of uniqueness.
       */

      const key = allocationKey({
        academicYearId,
        teacherId,
        subjectId,
        classId: classRecord.id,
        sectionId: section.id,
      });

      if (importKeys.has(key)) {
        errors.push({
          row,
          message: "Duplicate teacher allocation in this import batch.",
        });
        continue;
      }

      importKeys.add(key);

      resolved.push({
        row,

        employeeId,
        academicYear,
        subject,
        className,
        section: sectionName,

        teacherId,
        academicYearId,
        subjectId,
        classId: classRecord.id,
        sectionId: section.id,

        active: item.active !== false,
        remarks: item.remarks?.trim() || null,
      });
    }

    /*
     * -------------------------------------------------------
     * Stop this batch if master-data validation failed.
     * -------------------------------------------------------
     */

    if (errors.length) {
      return ApiResponse.success(
        {
          created: 0,
          skipped: 0,
          failed: errors.length,
          errors,
          skippedRows: [],
        },
        "Validation failed. No allocations from this batch were imported.",
      );
    }

    /*
     * -------------------------------------------------------
     * Nothing resolved
     * -------------------------------------------------------
     */

    if (!resolved.length) {
      return ApiResponse.success(
        {
          created: 0,
          skipped: 0,
          failed: 0,
          errors: [],
          skippedRows: [],
        },
        "No teacher allocations were available to import.",
      );
    }

    /*
     * -------------------------------------------------------
     * Find allocations already stored in SchoolDB
     * -------------------------------------------------------
     */

    const existing = await prisma.teacherAllocation.findMany({
      where: {
        schoolId: tenant.schoolId,

        OR: resolved.map((item) => ({
          academicYearId: item.academicYearId,
          teacherId: item.teacherId,
          subjectId: item.subjectId,
          classId: item.classId,
          sectionId: item.sectionId,
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

    const existingKeys = new Set(
      existing.map((item) =>
        allocationKey({
          academicYearId: item.academicYearId,
          teacherId: item.teacherId,
          subjectId: item.subjectId,
          classId: item.classId,
          sectionId: item.sectionId,
        }),
      ),
    );

    /*
     * -------------------------------------------------------
     * Separate NEW and EXISTING allocations
     * -------------------------------------------------------
     */

    const skippedRows: Array<
      RowError & {
        employeeId: string;
        academicYear: string;
        subject: string;
        className: string;
        section: string;
      }
    > = [];

    const toCreate: ResolvedAllocation[] = [];

    for (const item of resolved) {
      const key = allocationKey({
        academicYearId: item.academicYearId,
        teacherId: item.teacherId,
        subjectId: item.subjectId,
        classId: item.classId,
        sectionId: item.sectionId,
      });

      if (existingKeys.has(key)) {
        skippedRows.push({
          row: item.row,
          employeeId: item.employeeId,
          academicYear: item.academicYear,
          subject: item.subject,
          className: item.className,
          section: item.section,
          message: "Teacher allocation already exists.",
        });

        continue;
      }

      toCreate.push(item);
    }

    /*
     * -------------------------------------------------------
     * Insert only NEW allocations
     *
     * Existing allocations are ignored.
     * -------------------------------------------------------
     */

    if (toCreate.length > 0) {
      await prisma.$transaction(
        toCreate.map((item) =>
          prisma.teacherAllocation.create({
            data: {
              schoolId: tenant.schoolId,
              academicYearId: item.academicYearId,
              teacherId: item.teacherId,
              subjectId: item.subjectId,
              classId: item.classId,
              sectionId: item.sectionId,
              active: item.active,
              remarks: item.remarks,
            },
          }),
        ),
      );
    }

    /*
     * -------------------------------------------------------
     * Response
     * -------------------------------------------------------
     */

    const created = toCreate.length;
    const skipped = skippedRows.length;

    let message = "Teacher allocations imported successfully.";

    if (created === 0 && skipped > 0) {
      message =
        `No new teacher allocations were imported. ` +
        `${skipped} existing allocation${skipped === 1 ? "" : "s"} skipped.`;
    } else if (created > 0 && skipped > 0) {
      message =
        `${created} teacher allocation${created === 1 ? "" : "s"} imported. ` +
        `${skipped} existing allocation${skipped === 1 ? "" : "s"} skipped.`;
    } else if (created > 0) {
      message = `${created} teacher allocation${
        created === 1 ? "" : "s"
      } imported successfully.`;
    }

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
