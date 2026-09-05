import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";

const MAX_ROWS = 500;

type EnrollmentInput = {
  admissionNo?: unknown;
  academicYear?: unknown;
  className?: unknown;
  sectionName?: unknown;
  rollNo?: unknown;
  admissionDate?: unknown;
  active?: unknown;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function bool(value: unknown) {
  return /^(true|yes|1)$/i.test(text(value || "true"));
}

function parseDate(value: unknown) {
  const raw = text(value);
  if (!raw) return null;
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const date = match
    ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
    : new Date(raw);
  if (Number.isNaN(date.getTime()))
    throw new Error(`Invalid admission date: ${raw}`);
  return date;
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = (await req.json()) as { enrollments?: EnrollmentInput[] };
    const rows = Array.isArray(body.enrollments) ? body.enrollments : [];

    if (!rows.length) throw new Error("No enrollment rows were provided.");
    if (rows.length > MAX_ROWS)
      throw new Error(`Maximum ${MAX_ROWS} enrollments per import.`);

    const admissions = rows.map((row) => text(row.admissionNo));
    const academicYears = [
      ...new Set(rows.map((row) => text(row.academicYear)).filter(Boolean)),
    ];
    const classNames = [
      ...new Set(rows.map((row) => text(row.className)).filter(Boolean)),
    ];

    if (admissions.some((value) => !value))
      throw new Error("Every row must contain an admission number.");
    if (
      rows.some(
        (row) =>
          !text(row.academicYear) ||
          !text(row.className) ||
          !text(row.sectionName),
      )
    ) {
      throw new Error(
        "Every row must contain academic year, class name, and section name.",
      );
    }

    const students = await prisma.student.findMany({
      where: { schoolId: tenant.schoolId, admissionNo: { in: admissions } },
      select: { id: true, admissionNo: true },
    });
    const studentByAdmission = new Map(
      students.map((student) => [student.admissionNo.toLowerCase(), student]),
    );

    const years = await prisma.academicYear.findMany({
      where: { schoolId: tenant.schoolId, name: { in: academicYears } },
      select: { id: true, name: true },
    });
    const yearByName = new Map(
      years.map((year) => [year.name.toLowerCase(), year]),
    );

    const classes = await prisma.class.findMany({
      where: { schoolId: tenant.schoolId, name: { in: classNames } },
      select: {
        id: true,
        name: true,
        sections: { select: { id: true, name: true } },
      },
    });
    const classByName = new Map(
      classes.map((item) => [item.name.toLowerCase(), item]),
    );

    const prepared = rows.map((row, index) => {
      const rowNo = index + 2;
      const admissionNo = text(row.admissionNo);
      const student = studentByAdmission.get(admissionNo.toLowerCase());
      if (!student)
        throw new Error(
          `Row ${rowNo}: student not found for admission number ${admissionNo}.`,
        );

      const academicYearName = text(row.academicYear);
      const academicYear = yearByName.get(academicYearName.toLowerCase());
      if (!academicYear)
        throw new Error(
          `Row ${rowNo}: academic year not found: ${academicYearName}.`,
        );

      const className = text(row.className);
      const schoolClass = classByName.get(className.toLowerCase());
      if (!schoolClass)
        throw new Error(`Row ${rowNo}: class not found: ${className}.`);

      const sectionName = text(row.sectionName);
      const section = schoolClass.sections.find(
        (item) => item.name.toLowerCase() === sectionName.toLowerCase(),
      );
      if (!section)
        throw new Error(
          `Row ${rowNo}: section ${sectionName} not found under ${className}.`,
        );

      const rollRaw = text(row.rollNo);
      const rollNo = rollRaw ? Number(rollRaw) : null;
      if (rollRaw && (!Number.isInteger(rollNo) || rollNo! <= 0))
        throw new Error(
          `Row ${rowNo}: roll number must be a positive integer.`,
        );

      return {
        schoolId: tenant.schoolId,
        studentId: student.id,
        academicYearId: academicYear.id,
        classId: schoolClass.id,
        sectionId: section.id,
        rollNo,
        admissionDate: parseDate(row.admissionDate),
        active: bool(row.active),
      };
    });

    const studentYearKeys = new Set<string>();
    const rollKeys = new Set<string>();
    for (let index = 0; index < prepared.length; index += 1) {
      const item = prepared[index];
      const studentYearKey = `${item.studentId}:${item.academicYearId}`;
      if (studentYearKeys.has(studentYearKey))
        throw new Error(
          `Row ${index + 2}: duplicate student enrollment in this import.`,
        );
      studentYearKeys.add(studentYearKey);
      if (item.rollNo !== null) {
        const rollKey = `${item.academicYearId}:${item.classId}:${item.sectionId}:${item.rollNo}`;
        if (rollKeys.has(rollKey))
          throw new Error(
            `Row ${index + 2}: duplicate roll number in this import.`,
          );
        rollKeys.add(rollKey);
      }
    }

    const existingStudents = await prisma.studentEnrollment.findMany({
      where: {
        schoolId: tenant.schoolId,
        studentId: { in: prepared.map((item) => item.studentId) },
        academicYearId: { in: prepared.map((item) => item.academicYearId) },
      },
      select: { studentId: true, academicYearId: true },
    });
    if (existingStudents.length)
      throw new Error(
        "One or more students already have an enrollment for the selected academic year.",
      );

    const existingRolls = prepared.some((item) => item.rollNo !== null)
      ? await prisma.studentEnrollment.findMany({
          where: {
            schoolId: tenant.schoolId,
            academicYearId: { in: prepared.map((item) => item.academicYearId) },
          },
          select: {
            academicYearId: true,
            classId: true,
            sectionId: true,
            rollNo: true,
          },
        })
      : [];
    const existingRollKeys = new Set(
      existingRolls
        .filter((item) => item.rollNo !== null)
        .map(
          (item) =>
            `${item.academicYearId}:${item.classId}:${item.sectionId}:${item.rollNo}`,
        ),
    );
    for (let index = 0; index < prepared.length; index += 1) {
      const item = prepared[index];
      if (
        item.rollNo !== null &&
        existingRollKeys.has(
          `${item.academicYearId}:${item.classId}:${item.sectionId}:${item.rollNo}`,
        )
      ) {
        throw new Error(
          `Row ${index + 2}: roll number ${item.rollNo} already exists in that class and section.`,
        );
      }
    }

    await prisma.$transaction(
      prepared.map((item) => prisma.studentEnrollment.create({ data: item })),
    );

    return ApiResponse.success(
      { created: prepared.length, failed: 0, errors: [] },
      "Student enrollments imported successfully.",
    );
  });
}
