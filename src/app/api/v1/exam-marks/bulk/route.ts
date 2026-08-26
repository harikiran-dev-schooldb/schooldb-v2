import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";

const MAX_ROWS = 1000;

const VALID_STATUSES = new Set([
  "PRESENT",
  "ABSENT",
  "EXEMPTED",
]);

type ImportRow = {
  examName: string;
  academicYear: string;
  className: string;
  sectionName: string;
  subjectName: string;
  admissionNo: string;
  marks: string;
  status: string;
  remarks: string;
};

type PreparedRow = Omit<
  ImportRow,
  "status" | "marks"
> & {
  status: "PRESENT" | "ABSENT" | "EXEMPTED";
  marks: number | null;
};

type ResolvedRow = {
  schoolId: string;
  examScheduleId: string;
  studentEnrollmentId: string;
  marksObtained: number | null;
  status: "PRESENT" | "ABSENT" | "EXEMPTED";
  remarks: string | null;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeStatus(value: string) {
  return value.trim().toUpperCase();
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const body = (await request.json()) as {
      marks?: unknown;
    };

    const input = Array.isArray(body.marks)
      ? body.marks
      : [];

    if (!input.length) {
      throw new Error(
        "No exam marks were provided.",
      );
    }

    if (input.length > MAX_ROWS) {
      throw new Error(
        `Maximum ${MAX_ROWS} marks per import.`,
      );
    }

    const rows = input as ImportRow[];

    /*
     * STEP 1
     * Validate uploaded rows.
     */
    const seen = new Set<string>();
    const prepared: PreparedRow[] = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const rowNumber = i + 2;

      const examName =
        row.examName?.trim() ?? "";

      const academicYear =
        row.academicYear?.trim() ?? "";

      const className =
        row.className?.trim() ?? "";

      const sectionName =
        row.sectionName?.trim() ?? "";

      const subjectName =
        row.subjectName?.trim() ?? "";

      const admissionNo =
        row.admissionNo?.trim() ?? "";

      const status = normalizeStatus(
        row.status || "PRESENT",
      );

      const marksText =
        row.marks?.trim() ?? "";

      if (
        !examName ||
        !academicYear ||
        !className ||
        !subjectName ||
        !admissionNo
      ) {
        throw new Error(
          `Row ${rowNumber}: Exam, academic year, class, subject and admission number are required.`,
        );
      }

      if (!VALID_STATUSES.has(status)) {
        throw new Error(
          `Row ${rowNumber}: Status must be PRESENT, ABSENT or EXEMPTED.`,
        );
      }

      const marks =
        marksText === ""
          ? null
          : Number(marksText);

      if (
        status === "PRESENT" &&
        marks === null
      ) {
        throw new Error(
          `Row ${rowNumber}: Marks are required for PRESENT students.`,
        );
      }

      if (
        marks !== null &&
        (
          !Number.isFinite(marks) ||
          marks < 0
        )
      ) {
        throw new Error(
          `Row ${rowNumber}: Marks must be a valid non-negative number.`,
        );
      }

      if (
        status !== "PRESENT" &&
        marks !== null
      ) {
        throw new Error(
          `Row ${rowNumber}: Marks must be blank when status is ${status}.`,
        );
      }

      const duplicateKey = [
        examName,
        academicYear,
        className,
        sectionName,
        subjectName,
        admissionNo,
      ]
        .map(normalize)
        .join(":");

      if (seen.has(duplicateKey)) {
        throw new Error(
          `Duplicate student mark in import at row ${rowNumber}.`,
        );
      }

      seen.add(duplicateKey);

      prepared.push({
        ...row,
        examName,
        academicYear,
        className,
        sectionName,
        subjectName,
        admissionNo,
        status:
          status as PreparedRow["status"],
        marks,
      });
    }

    /*
     * STEP 2
     * Load school-owned master data.
     */
    const [
      academicYears,
      exams,
      classes,
      sections,
      subjects,
      students,
      enrollments,
      schedules,
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

      prisma.exam.findMany({
        where: {
          schoolId: tenant.schoolId,
        },
        select: {
          id: true,
          name: true,
          academicYearId: true,
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

      /*
       * Section belongs to Class.
       *
       * Therefore we do not filter sections by
       * schoolId. We validate through classId.
       */
      prisma.section.findMany({
        select: {
          id: true,
          name: true,
          classId: true,
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

      prisma.student.findMany({
        where: {
          schoolId: tenant.schoolId,
        },
        select: {
          id: true,
          admissionNo: true,
        },
      }),

      /*
       * Only enrollments belonging to this school
       * are loaded.
       */
      prisma.studentEnrollment.findMany({
        where: {
          schoolId: tenant.schoolId,
        },
        select: {
          id: true,
          studentId: true,
          academicYearId: true,
          classId: true,
          sectionId: true,
        },
      }),

      /*
       * Only schedules belonging to this school
       * are loaded.
       */
      prisma.examSchedule.findMany({
        where: {
          schoolId: tenant.schoolId,
        },
        select: {
          id: true,
          examId: true,
          classId: true,
          sectionId: true,
          subjectId: true,
          maxMarks: true,
        },
      }),
    ]);

    /*
     * STEP 3
     * Build lookup maps.
     */
    const yearByName = new Map(
      academicYears.map((item) => [
        normalize(item.name),
        item,
      ]),
    );

    const classByName = new Map(
      classes.map((item) => [
        normalize(item.name),
        item,
      ]),
    );

    const subjectByName = new Map(
      subjects.map((item) => [
        normalize(item.name),
        item,
      ]),
    );

    const studentByAdmission =
      new Map(
        students.map((item) => [
          normalize(item.admissionNo),
          item,
        ]),
      );

    const examByKey = new Map(
      exams.map((item) => [
        `${item.academicYearId}:${normalize(item.name)}`,
        item,
      ]),
    );

    /*
     * Section lookup:
     *
     * CLASS + SECTION
     */
    const sectionByKey = new Map(
      sections.map((section) => [
        `${section.classId}:${normalize(section.name)}`,
        section,
      ]),
    );

    /*
     * Enrollment lookup:
     *
     * STUDENT + ACADEMIC YEAR + CLASS + SECTION
     */
    const enrollmentByKey =
      new Map(
        enrollments.map((enrollment) => [
          [
            enrollment.studentId,
            enrollment.academicYearId,
            enrollment.classId,
            enrollment.sectionId ?? "",
          ].join(":"),
          enrollment,
        ]),
      );

    /*
     * Schedule lookup:
     *
     * EXAM + CLASS + SECTION + SUBJECT
     */
    const scheduleByKey =
      new Map(
        schedules.map((schedule) => [
          [
            schedule.examId,
            schedule.classId,
            schedule.sectionId ?? "",
            schedule.subjectId,
          ].join(":"),
          schedule,
        ]),
      );

    /*
     * STEP 4
     * Resolve every uploaded row.
     */
    const resolved: ResolvedRow[] = [];

    for (
      let i = 0;
      i < prepared.length;
      i += 1
    ) {
      const row = prepared[i];
      const rowNumber = i + 2;

      /*
       * Academic year
       */
      const year = yearByName.get(
        normalize(row.academicYear),
      );

      if (!year) {
        throw new Error(
          `Row ${rowNumber}: Academic year not found: ${row.academicYear}.`,
        );
      }

      /*
       * Exam
       */
      const exam = examByKey.get(
        `${year.id}:${normalize(row.examName)}`,
      );

      if (!exam) {
        throw new Error(
          `Row ${rowNumber}: Exam not found: ${row.examName}.`,
        );
      }

      /*
       * Class
       */
      const classRecord =
        classByName.get(
          normalize(row.className),
        );

      if (!classRecord) {
        throw new Error(
          `Row ${rowNumber}: Class not found: ${row.className}.`,
        );
      }

      /*
       * Section
       *
       * Section is resolved through classId.
       */
      let sectionId: string | null =
        null;

      if (row.sectionName) {
        const section =
          sectionByKey.get(
            `${classRecord.id}:${normalize(row.sectionName)}`,
          );

        if (!section) {
          throw new Error(
            `Row ${rowNumber}: Section ${row.sectionName} not found in ${row.className}.`,
          );
        }

        if (
          section.classId !==
          classRecord.id
        ) {
          throw new Error(
            `Row ${rowNumber}: Section does not belong to the selected class.`,
          );
        }

        sectionId = section.id;
      }

      /*
       * Subject
       */
      const subject =
        subjectByName.get(
          normalize(row.subjectName),
        );

      if (!subject) {
        throw new Error(
          `Row ${rowNumber}: Subject not found: ${row.subjectName}.`,
        );
      }

      /*
       * Student
       */
      const student =
        studentByAdmission.get(
          normalize(row.admissionNo),
        );

      if (!student) {
        throw new Error(
          `Row ${rowNumber}: Student not found: ${row.admissionNo}.`,
        );
      }

      /*
       * Enrollment
       *
       * Student must belong to the selected
       * academic year + class + section.
       */
      const enrollmentKey = [
        student.id,
        year.id,
        classRecord.id,
        sectionId ?? "",
      ].join(":");

      const enrollment =
        enrollmentByKey.get(
          enrollmentKey,
        );

      if (!enrollment) {
        throw new Error(
          `Row ${rowNumber}: Student ${row.admissionNo} is not enrolled in ${row.className}${sectionId ? ` - ${row.sectionName}` : ""} for ${row.academicYear}.`,
        );
      }

      /*
       * Exam schedule
       */
      const scheduleKey = [
        exam.id,
        classRecord.id,
        sectionId ?? "",
        subject.id,
      ].join(":");

      const schedule =
        scheduleByKey.get(
          scheduleKey,
        );

      if (!schedule) {
        throw new Error(
          `Row ${rowNumber}: Exam schedule not found for ${row.subjectName} in ${row.className}${sectionId ? ` - ${row.sectionName}` : ""}.`,
        );
      }

      /*
       * Marks cannot exceed schedule max marks.
       */
      if (
        row.marks !== null &&
        row.marks >
          Number(schedule.maxMarks)
      ) {
        throw new Error(
          `Row ${rowNumber}: Marks ${row.marks} exceed the maximum ${schedule.maxMarks}.`,
        );
      }

      resolved.push({
        schoolId: tenant.schoolId,
        examScheduleId: schedule.id,
        studentEnrollmentId:
          enrollment.id,
        marksObtained: row.marks,
        status: row.status,
        remarks:
          row.remarks?.trim() || null,
      });
    }

    /*
     * STEP 5
     * Check existing marks.
     */
    const existing =
      await prisma.studentExamMark.findMany({
        where: {
          schoolId: tenant.schoolId,

          OR: resolved.map(
            (row) => ({
              examScheduleId:
                row.examScheduleId,
              studentEnrollmentId:
                row.studentEnrollmentId,
            }),
          ),
        },

        select: {
          id: true,
        },
      });

    if (existing.length > 0) {
      throw new Error(
        "One or more student marks already exist for the selected exam schedule and student.",
      );
    }

    /*
     * STEP 6
     * Create all marks atomically.
     */
    await prisma.$transaction(
      resolved.map((row) =>
        prisma.studentExamMark.create({
          data: {
            schoolId:
              row.schoolId,

            examScheduleId:
              row.examScheduleId,

            studentEnrollmentId:
              row.studentEnrollmentId,

            marksObtained:
              row.marksObtained,

            status:
              row.status,

            remarks:
              row.remarks,
          },
        }),
      ),
    );

    return ApiResponse.success(
      {
        created:
          resolved.length,
        failed: 0,
        errors: [],
      },
      "Exam marks imported successfully.",
    );
  });
}