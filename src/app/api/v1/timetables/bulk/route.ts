import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";
import { WeekDay } from "@/generated/prisma/client";

const MAX_ROWS = 500;

type ImportRow = {
  academicYear: string;
  className: string;
  sectionName: string;
  teacherName: string;
  subjectName: string;
  periodName: string;
  day: string;
  active: string;
};

type PreparedRow = {
  academicYear: string;
  className: string;
  sectionName: string;
  teacherName: string;
  subjectName: string;
  periodName: string;
  day: WeekDay;
  active: boolean;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function parseBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  if (
    normalized === "" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "1"
  ) {
    return true;
  }

  if (normalized === "false" || normalized === "no" || normalized === "0") {
    return false;
  }

  throw new Error("Active must be TRUE, FALSE, YES, NO, 1 or 0.");
}

function parseWeekDay(value: string): WeekDay {
  const normalized = value.trim().toUpperCase();

  const validDays: WeekDay[] = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];

  if (!validDays.includes(normalized as WeekDay)) {
    throw new Error(
      "Day must be MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY or SUNDAY.",
    );
  }

  return normalized as WeekDay;
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);

    const body = (await request.json()) as {
      timetables?: unknown;
    };

    const input = Array.isArray(body.timetables) ? body.timetables : [];

    if (input.length === 0) {
      throw new Error("No timetable rows were provided.");
    }

    if (input.length > MAX_ROWS) {
      throw new Error(`Maximum ${MAX_ROWS} timetable rows per import.`);
    }

    const rows = input as ImportRow[];

    const seen = new Set<string>();

    const prepared: PreparedRow[] = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const rowNumber = i + 2;

      if (
        !row.academicYear?.trim() ||
        !row.className?.trim() ||
        !row.sectionName?.trim() ||
        !row.teacherName?.trim() ||
        !row.subjectName?.trim() ||
        !row.periodName?.trim() ||
        !row.day?.trim()
      ) {
        throw new Error(
          `Row ${rowNumber}: Academic year, class, section, teacher, subject, period and day are required.`,
        );
      }

      let day: WeekDay;

      try {
        day = parseWeekDay(row.day);
      } catch (error) {
        throw new Error(
          `Row ${rowNumber}: ${
            error instanceof Error ? error.message : "Invalid day."
          }`,
        );
      }

      let active = true;

      try {
        active = parseBoolean(row.active ?? "");
      } catch (error) {
        throw new Error(
          `Row ${rowNumber}: ${
            error instanceof Error ? error.message : "Invalid active value."
          }`,
        );
      }

      const duplicateKey = [
        row.academicYear,
        row.className,
        row.sectionName,
        row.teacherName,
        row.subjectName,
        row.periodName,
        day,
      ]
        .map(normalize)
        .join(":");

      if (seen.has(duplicateKey)) {
        throw new Error(
          `Duplicate timetable entry in import at row ${rowNumber}.`,
        );
      }

      seen.add(duplicateKey);

      prepared.push({
        academicYear: row.academicYear.trim(),
        className: row.className.trim(),
        sectionName: row.sectionName.trim(),
        teacherName: row.teacherName.trim(),
        subjectName: row.subjectName.trim(),
        periodName: row.periodName.trim(),
        day,
        active,
      });
    }

    const [
      academicYears,
      classes,
      sections,
      teachers,
      subjects,
      periods,
      allocations,
    ] = await Promise.all([
      prisma.academicYear.findMany({
        where: {
          schoolId: tenant.schoolId,
        },
        select: {
          id: true,
          name: true,
        },
      }),

      prisma.class.findMany({
        where: {
          schoolId: tenant.schoolId,
        },
        select: {
          id: true,
          name: true,
        },
      }),

      prisma.section.findMany({
        where: {
          class: {
            schoolId: tenant.schoolId,
          },
        },
        select: {
          id: true,
          name: true,
          classId: true,
        },
      }),

      prisma.teacher.findMany({
        where: {
          schoolId: tenant.schoolId,
        },
        select: {
          id: true,
          fullName: true,
        },
      }),

      prisma.subject.findMany({
        where: {
          schoolId: tenant.schoolId,
        },
        select: {
          id: true,
          name: true,
        },
      }),

      prisma.period.findMany({
        where: {
          schoolId: tenant.schoolId,
        },
        select: {
          id: true,
          name: true,
          displayOrder: true,
        },
      }),

      prisma.teacherAllocation.findMany({
        where: {
          schoolId: tenant.schoolId,
          active: true,
        },
        select: {
          id: true,
          academicYearId: true,
          teacherId: true,
          subjectId: true,
          classId: true,
          sectionId: true,
        },
      }),
    ]);

    const academicYearByName = new Map(
      academicYears.map((item) => [normalize(item.name), item]),
    );

    const classByName = new Map(
      classes.map((item) => [normalize(item.name), item]),
    );

    const teacherByName = new Map(
      teachers.map((item) => [normalize(item.fullName), item]),
    );

    const subjectByName = new Map(
      subjects.map((item) => [normalize(item.name), item]),
    );

    const periodByName = new Map(
      periods.map((item) => [normalize(item.name), item]),
    );

    const sectionByClassAndName = new Map(
      sections.map((item) => [`${item.classId}:${normalize(item.name)}`, item]),
    );

    const allocationByKey = new Map(
      allocations.map((item) => [
        [
          item.academicYearId,
          item.teacherId,
          item.subjectId,
          item.classId,
          item.sectionId,
        ].join(":"),
        item,
      ]),
    );

    const resolved: Array<{
      schoolId: string;
      academicYearId: string;
      teacherAllocationId: string;
      periodId: string;
      day: WeekDay;
      active: boolean;
    }> = [];

    for (let i = 0; i < prepared.length; i += 1) {
      const row = prepared[i];
      const rowNumber = i + 2;

      const academicYear = academicYearByName.get(normalize(row.academicYear));

      if (!academicYear) {
        throw new Error(
          `Row ${rowNumber}: Academic year not found: ${row.academicYear}.`,
        );
      }

      const classRecord = classByName.get(normalize(row.className));

      if (!classRecord) {
        throw new Error(`Row ${rowNumber}: Class not found: ${row.className}.`);
      }

      const section = sectionByClassAndName.get(
        `${classRecord.id}:${normalize(row.sectionName)}`,
      );

      if (!section) {
        throw new Error(
          `Row ${rowNumber}: Section ${row.sectionName} not found in ${row.className}.`,
        );
      }

      const teacher = teacherByName.get(normalize(row.teacherName));

      if (!teacher) {
        throw new Error(
          `Row ${rowNumber}: Teacher not found: ${row.teacherName}.`,
        );
      }

      const subject = subjectByName.get(normalize(row.subjectName));

      if (!subject) {
        throw new Error(
          `Row ${rowNumber}: Subject not found: ${row.subjectName}.`,
        );
      }

      const period = periodByName.get(normalize(row.periodName));

      if (!period) {
        throw new Error(
          `Row ${rowNumber}: Period not found: ${row.periodName}.`,
        );
      }

      const allocation = allocationByKey.get(
        [
          academicYear.id,
          teacher.id,
          subject.id,
          classRecord.id,
          section.id,
        ].join(":"),
      );

      if (!allocation) {
        throw new Error(
          `Row ${rowNumber}: Teacher allocation not found for ${row.teacherName}, ${row.subjectName}, ${row.className} - ${row.sectionName}.`,
        );
      }

      const existingDuplicate = await prisma.timetable.findFirst({
        where: {
          schoolId: tenant.schoolId,
          academicYearId: academicYear.id,
          teacherAllocationId: allocation.id,
          periodId: period.id,
          day: row.day,
        },
        select: {
          id: true,
        },
      });

      if (existingDuplicate) {
        throw new Error(`Row ${rowNumber}: Timetable entry already exists.`);
      }

      const teacherConflict = await prisma.timetable.findFirst({
        where: {
          schoolId: tenant.schoolId,
          academicYearId: academicYear.id,
          periodId: period.id,
          day: row.day,

          teacherAllocation: {
            teacherId: teacher.id,
          },
        },
        select: {
          id: true,
        },
      });

      if (teacherConflict) {
        throw new Error(
          `Row ${rowNumber}: Teacher ${row.teacherName} already has another class during this period.`,
        );
      }

      const classConflict = await prisma.timetable.findFirst({
        where: {
          schoolId: tenant.schoolId,
          academicYearId: academicYear.id,
          periodId: period.id,
          day: row.day,

          teacherAllocation: {
            classId: classRecord.id,
            sectionId: section.id,
          },
        },
        select: {
          id: true,
        },
      });

      if (classConflict) {
        throw new Error(
          `Row ${rowNumber}: ${row.className} - ${row.sectionName} already has another subject during this period.`,
        );
      }

      /*
       * Check conflicts against earlier rows
       * in the same CSV import.
       */
      for (const previous of resolved) {
        if (
          previous.academicYearId === academicYear.id &&
          previous.periodId === period.id &&
          previous.day === row.day
        ) {
          const previousAllocation = allocations.find(
            (item) => item.id === previous.teacherAllocationId,
          );

          if (!previousAllocation) {
            continue;
          }

          if (previousAllocation.teacherId === teacher.id) {
            throw new Error(
              `Row ${rowNumber}: Teacher ${row.teacherName} is assigned to multiple classes during the same period in this import.`,
            );
          }

          if (
            previousAllocation.classId === classRecord.id &&
            previousAllocation.sectionId === section.id
          ) {
            throw new Error(
              `Row ${rowNumber}: ${row.className} - ${row.sectionName} has multiple subjects during the same period in this import.`,
            );
          }
        }
      }

      resolved.push({
        schoolId: tenant.schoolId,
        academicYearId: academicYear.id,
        teacherAllocationId: allocation.id,
        periodId: period.id,
        day: row.day,
        active: row.active,
      });
    }

    await prisma.$transaction(
      resolved.map((row) =>
        prisma.timetable.create({
          data: {
            school: {
              connect: {
                id: row.schoolId,
              },
            },

            academicYear: {
              connect: {
                id: row.academicYearId,
              },
            },

            teacherAllocation: {
              connect: {
                id: row.teacherAllocationId,
              },
            },

            period: {
              connect: {
                id: row.periodId,
              },
            },

            day: row.day,
            active: row.active,
          },
        }),
      ),
    );

    return ApiResponse.success(
      {
        created: resolved.length,
        failed: 0,
        errors: [],
      },
      "Timetable imported successfully.",
    );
  });
}
