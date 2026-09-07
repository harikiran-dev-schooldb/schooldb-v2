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

type ResolvedRow = {
  rowNumber: number;
  schoolId: string;
  academicYearId: string;
  teacherAllocationId: string;
  teacherId: string;
  classId: string;
  sectionId: string;
  periodId: string;
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

    const resolved: ResolvedRow[] = [];
    const importedTeacherSlots = new Set<string>();
    const importedClassSlots = new Set<string>();

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

      const teacherSlot = [
        academicYear.id,
        teacher.id,
        period.id,
        row.day,
      ].join(":");
      const classSlot = [
        academicYear.id,
        classRecord.id,
        section.id,
        period.id,
        row.day,
      ].join(":");

      if (importedTeacherSlots.has(teacherSlot)) {
        throw new Error(
          `Row ${rowNumber}: Teacher ${row.teacherName} is assigned to multiple classes during the same period in this import.`,
        );
      }

      if (importedClassSlots.has(classSlot)) {
        throw new Error(
          `Row ${rowNumber}: ${row.className} - ${row.sectionName} has multiple subjects during the same period in this import.`,
        );
      }

      importedTeacherSlots.add(teacherSlot);
      importedClassSlots.add(classSlot);

      resolved.push({
        rowNumber,
        schoolId: tenant.schoolId,
        academicYearId: academicYear.id,
        teacherAllocationId: allocation.id,
        teacherId: teacher.id,
        classId: classRecord.id,
        sectionId: section.id,
        periodId: period.id,
        day: row.day,
        active: row.active,
      });
    }

    const slotFilters = [
      ...new Map(
        resolved.map((row) => [
          `${row.academicYearId}:${row.periodId}:${row.day}`,
          {
            academicYearId: row.academicYearId,
            periodId: row.periodId,
            day: row.day,
          },
        ]),
      ).values(),
    ];

    const existing = await prisma.timetable.findMany({
      where: {
        schoolId: tenant.schoolId,
        OR: slotFilters,
      },
      select: {
        academicYearId: true,
        teacherAllocationId: true,
        periodId: true,
        day: true,
        teacherAllocation: {
          select: {
            teacherId: true,
            classId: true,
            sectionId: true,
          },
        },
      },
    });

    const existingExact = new Set(
      existing.map((item) =>
        [
          item.academicYearId,
          item.teacherAllocationId,
          item.periodId,
          item.day,
        ].join(":"),
      ),
    );
    const existingTeacherSlots = new Set(
      existing.map((item) =>
        [
          item.academicYearId,
          item.teacherAllocation.teacherId,
          item.periodId,
          item.day,
        ].join(":"),
      ),
    );
    const existingClassSlots = new Set(
      existing.map((item) =>
        [
          item.academicYearId,
          item.teacherAllocation.classId,
          item.teacherAllocation.sectionId,
          item.periodId,
          item.day,
        ].join(":"),
      ),
    );

    for (const row of resolved) {
      const exactKey = [
        row.academicYearId,
        row.teacherAllocationId,
        row.periodId,
        row.day,
      ].join(":");
      const teacherKey = [
        row.academicYearId,
        row.teacherId,
        row.periodId,
        row.day,
      ].join(":");
      const classKey = [
        row.academicYearId,
        row.classId,
        row.sectionId,
        row.periodId,
        row.day,
      ].join(":");

      if (existingExact.has(exactKey)) {
        throw new Error(`Row ${row.rowNumber}: Timetable entry already exists.`);
      }
      if (existingTeacherSlots.has(teacherKey)) {
        throw new Error(
          `Row ${row.rowNumber}: Teacher already has another class during this period.`,
        );
      }
      if (existingClassSlots.has(classKey)) {
        throw new Error(
          `Row ${row.rowNumber}: Class and section already have another subject during this period.`,
        );
      }
    }

    await prisma.timetable.createMany({
      data: resolved.map((row) => ({
        schoolId: row.schoolId,
        academicYearId: row.academicYearId,
        teacherAllocationId: row.teacherAllocationId,
        periodId: row.periodId,
        day: row.day,
        active: row.active,
      })),
    });

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
