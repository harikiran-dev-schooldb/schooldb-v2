import { WeekDay } from "@/generated/prisma/client";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

const MAX_ROWS = 500;
const VALID_DAYS = new Set<WeekDay>([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
]);

type ImportRow = {
  academicYear?: unknown;
  employeeId?: unknown;
  subject?: unknown;
  className?: unknown;
  section?: unknown;
  period?: unknown;
  day?: unknown;
  active?: unknown;
};

type PreparedRow = {
  rowNumber: number;
  academicYear: string;
  employeeId: string;
  subject: string;
  className: string;
  section: string;
  period: string;
  day: WeekDay;
  active: boolean;
};

type ResolvedRow = PreparedRow & {
  academicYearId: string;
  teacherAllocationId: string;
  teacherId: string;
  classId: string;
  sectionId: string;
  periodId: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function parseBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  const normalized = String(value ?? "true").trim().toLowerCase();
  if (["", "true", "yes", "1"].includes(normalized)) return true;
  if (["false", "no", "0"].includes(normalized)) return false;
  throw new Error("Active must be TRUE, FALSE, YES, NO, 1 or 0.");
}

function parseRow(row: ImportRow, rowNumber: number): PreparedRow {
  const academicYear = clean(row.academicYear);
  const employeeId = clean(row.employeeId);
  const subject = clean(row.subject);
  const className = clean(row.className);
  const section = clean(row.section);
  const period = clean(row.period);
  const normalizedDay = clean(row.day).toUpperCase();

  if (
    !academicYear ||
    !employeeId ||
    !subject ||
    !className ||
    !section ||
    !period ||
    !normalizedDay
  ) {
    throw new Error(
      `Row ${rowNumber}: Academic year, employee ID, subject, class, section, period and day are required.`,
    );
  }
  if (!VALID_DAYS.has(normalizedDay as WeekDay)) {
    throw new Error(`Row ${rowNumber}: Day must be MONDAY through SATURDAY.`);
  }

  try {
    return {
      rowNumber,
      academicYear,
      employeeId,
      subject,
      className,
      section,
      period,
      day: normalizedDay as WeekDay,
      active: parseBoolean(row.active),
    };
  } catch (error) {
    throw new Error(
      `Row ${rowNumber}: ${error instanceof Error ? error.message : "Invalid active value."}`,
    );
  }
}

function classSlotKey(row: {
  academicYearId: string;
  classId: string;
  sectionId: string;
  periodId: string;
  day: WeekDay;
}) {
  return [
    row.academicYearId,
    row.classId,
    row.sectionId,
    row.periodId,
    row.day,
  ].join(":");
}

function teacherSlotKey(row: {
  academicYearId: string;
  teacherId: string;
  periodId: string;
  day: WeekDay;
}) {
  return [row.academicYearId, row.teacherId, row.periodId, row.day].join(":");
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = (await request.json()) as { timetables?: unknown };
    const input = Array.isArray(body.timetables) ? body.timetables : [];
    if (!input.length) throw new Error("No timetable rows were provided.");
    if (input.length > MAX_ROWS)
      throw new Error(`Maximum ${MAX_ROWS} timetable rows per import.`);

    const prepared = input.map((row, index) =>
      parseRow((row ?? {}) as ImportRow, index + 2),
    );
    const seenSlots = new Set<string>();
    for (const row of prepared) {
      const key = [
        row.academicYear,
        row.className,
        row.section,
        row.period,
        row.day,
      ]
        .map(normalize)
        .join(":");
      if (seenSlots.has(key)) {
        throw new Error(
          `Row ${row.rowNumber}: Duplicate class timetable slot in this file.`,
        );
      }
      seenSlots.add(key);
    }

    const [academicYears, classes, sections, teachers, subjects, periods, allocations] =
      await Promise.all([
        prisma.academicYear.findMany({
          where: { schoolId: tenant.schoolId },
          select: { id: true, name: true },
        }),
        prisma.class.findMany({
          where: { schoolId: tenant.schoolId },
          select: { id: true, name: true },
        }),
        prisma.section.findMany({
          where: { class: { schoolId: tenant.schoolId } },
          select: { id: true, name: true, classId: true },
        }),
        prisma.teacher.findMany({
          where: { schoolId: tenant.schoolId },
          select: { id: true, employeeId: true },
        }),
        prisma.subject.findMany({
          where: { schoolId: tenant.schoolId },
          select: { id: true, name: true },
        }),
        prisma.period.findMany({
          where: { schoolId: tenant.schoolId },
          select: { id: true, name: true, active: true },
        }),
        prisma.teacherAllocation.findMany({
          where: { schoolId: tenant.schoolId, active: true },
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

    const yearByName = new Map(
      academicYears.map((value) => [normalize(value.name), value]),
    );
    const classByName = new Map(
      classes.map((value) => [normalize(value.name), value]),
    );
    const teacherByEmployeeId = new Map(
      teachers.map((value) => [normalize(value.employeeId), value]),
    );
    const subjectByName = new Map(
      subjects.map((value) => [normalize(value.name), value]),
    );
    const periodByName = new Map(
      periods.map((value) => [normalize(value.name), value]),
    );
    const sectionByClassAndName = new Map(
      sections.map((value) => [
        `${value.classId}:${normalize(value.name)}`,
        value,
      ]),
    );
    const allocationByKey = new Map(
      allocations.map((value) => [
        [
          value.academicYearId,
          value.teacherId,
          value.subjectId,
          value.classId,
          value.sectionId,
        ].join(":"),
        value,
      ]),
    );

    const resolved: ResolvedRow[] = prepared.map((row) => {
      const academicYear = yearByName.get(normalize(row.academicYear));
      if (!academicYear)
        throw new Error(
          `Row ${row.rowNumber}: Academic year not found: ${row.academicYear}.`,
        );
      const schoolClass = classByName.get(normalize(row.className));
      if (!schoolClass)
        throw new Error(
          `Row ${row.rowNumber}: Class not found: ${row.className}.`,
        );
      const section = sectionByClassAndName.get(
        `${schoolClass.id}:${normalize(row.section)}`,
      );
      if (!section)
        throw new Error(
          `Row ${row.rowNumber}: Section ${row.section} not found in ${row.className}.`,
        );
      const teacher = teacherByEmployeeId.get(normalize(row.employeeId));
      if (!teacher)
        throw new Error(
          `Row ${row.rowNumber}: Teacher employee ID not found: ${row.employeeId}.`,
        );
      const subject = subjectByName.get(normalize(row.subject));
      if (!subject)
        throw new Error(
          `Row ${row.rowNumber}: Subject not found: ${row.subject}.`,
        );
      const period = periodByName.get(normalize(row.period));
      if (!period || !period.active)
        throw new Error(
          `Row ${row.rowNumber}: Period not found or inactive: ${row.period}.`,
        );
      const allocation = allocationByKey.get(
        [
          academicYear.id,
          teacher.id,
          subject.id,
          schoolClass.id,
          section.id,
        ].join(":"),
      );
      if (!allocation)
        throw new Error(
          `Row ${row.rowNumber}: Active teacher allocation not found for ${row.employeeId}, ${row.subject}, ${row.className} - ${row.section}.`,
        );

      return {
        ...row,
        academicYearId: academicYear.id,
        teacherAllocationId: allocation.id,
        teacherId: teacher.id,
        classId: schoolClass.id,
        sectionId: section.id,
        periodId: period.id,
      };
    });

    const existing = await prisma.timetable.findMany({
      where: { schoolId: tenant.schoolId },
      select: {
        id: true,
        academicYearId: true,
        periodId: true,
        day: true,
        teacherAllocationId: true,
        teacherAllocation: {
          select: { teacherId: true, classId: true, sectionId: true },
        },
      },
    });
    const existingByClassSlot = new Map(
      existing.map((entry) => [
        classSlotKey({
          academicYearId: entry.academicYearId,
          classId: entry.teacherAllocation.classId,
          sectionId: entry.teacherAllocation.sectionId,
          periodId: entry.periodId,
          day: entry.day,
        }),
        entry,
      ]),
    );

    type FinalEntry = {
      id?: string;
      academicYearId: string;
      teacherId: string;
      classId: string;
      sectionId: string;
      periodId: string;
      day: WeekDay;
      importedRowNumber?: number;
    };
    const finalByClassSlot = new Map<string, FinalEntry>();
    for (const entry of existing) {
      const finalEntry: FinalEntry = {
        id: entry.id,
        academicYearId: entry.academicYearId,
        teacherId: entry.teacherAllocation.teacherId,
        classId: entry.teacherAllocation.classId,
        sectionId: entry.teacherAllocation.sectionId,
        periodId: entry.periodId,
        day: entry.day,
      };
      finalByClassSlot.set(classSlotKey(finalEntry), finalEntry);
    }
    for (const row of resolved) {
      const current = existingByClassSlot.get(classSlotKey(row));
      const finalEntry: FinalEntry = {
        id: current?.id,
        academicYearId: row.academicYearId,
        teacherId: row.teacherId,
        classId: row.classId,
        sectionId: row.sectionId,
        periodId: row.periodId,
        day: row.day,
        importedRowNumber: row.rowNumber,
      };
      finalByClassSlot.set(classSlotKey(finalEntry), finalEntry);
    }

    const teacherSlots = new Map<string, FinalEntry[]>();
    for (const entry of finalByClassSlot.values()) {
      const key = teacherSlotKey(entry);
      const entries = teacherSlots.get(key) ?? [];
      entries.push(entry);
      teacherSlots.set(key, entries);
    }
    for (const entries of teacherSlots.values()) {
      if (entries.length < 2) continue;
      const imported = entries.find((entry) => entry.importedRowNumber);
      if (imported?.importedRowNumber) {
        const row = resolved.find(
          (item) => item.rowNumber === imported.importedRowNumber,
        );
        throw new Error(
          `Row ${imported.importedRowNumber}: Teacher ${row?.employeeId ?? ""} already has another class during this period.`,
        );
      }
    }

    let created = 0;
    let updated = 0;
    await prisma.$transaction(
      resolved.map((row) => {
        const current = existingByClassSlot.get(classSlotKey(row));
        if (current) {
          updated += 1;
          return prisma.timetable.update({
            where: { id: current.id },
            data: {
              academicYearId: row.academicYearId,
              teacherAllocationId: row.teacherAllocationId,
              periodId: row.periodId,
              day: row.day,
              active: row.active,
            },
          });
        }

        created += 1;
        return prisma.timetable.create({
          data: {
            schoolId: tenant.schoolId,
            academicYearId: row.academicYearId,
            teacherAllocationId: row.teacherAllocationId,
            periodId: row.periodId,
            day: row.day,
            active: row.active,
          },
        });
      }),
    );

    return ApiResponse.success(
      { created, updated, failed: 0, errors: [] },
      "Timetable created and updated successfully.",
    );
  });
}
