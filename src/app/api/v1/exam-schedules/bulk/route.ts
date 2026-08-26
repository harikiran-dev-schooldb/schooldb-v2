import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";

const MAX_ROWS = 500;

type ImportRow = {
  examName: string;
  academicYear: string;
  className: string;
  sectionName: string;
  subjectName: string;
  examDate: string;
  startTime: string;
  endTime: string;
  maxMarks: string;
  passMarks: string;
};

type PreparedRow = Omit<
  ImportRow,
  "examDate" | "maxMarks" | "passMarks"
> & {
  examDate: Date;
  maxMarks: number;
  passMarks: number | null;
};

type ResolvedRow = {
  schoolId: string;
  examId: string;
  classId: string;
  sectionId: string | null;
  subjectId: string;
  examDate: Date;
  startTime: string | null;
  endTime: string | null;
  maxMarks: number;
  passMarks: number | null;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function parseDate(value: string): Date | null {
  const input = value.trim();

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);

  const dmy = /^(\d{2})[/-](\d{2})[/-](\d{2}|\d{4})$/.exec(
    input,
  );

  let year: number;
  let month: number;
  let day: number;

  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (dmy) {
    day = Number(dmy[1]);
    month = Number(dmy[2]);
    year = Number(dmy[3]);

    if (dmy[3].length === 2) {
      year += year >= 70 ? 1900 : 2000;
    }
  } else {
    return null;
  }

  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const body = (await request.json()) as {
      schedules?: unknown;
    };

    const schedules = Array.isArray(body.schedules)
      ? body.schedules
      : [];

    if (schedules.length === 0) {
      throw new Error(
        "No exam schedules were provided.",
      );
    }

    if (schedules.length > MAX_ROWS) {
      throw new Error(
        `Maximum ${MAX_ROWS} schedules per import.`,
      );
    }

    const rows = schedules as ImportRow[];

    const prepared: PreparedRow[] = [];

    const seen = new Set<string>();

    /*
     * STEP 1
     * Validate uploaded values.
     */
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const rowNumber = i + 2;

      const examName = row.examName?.trim() ?? "";
      const academicYear =
        row.academicYear?.trim() ?? "";
      const className =
        row.className?.trim() ?? "";
      const sectionName =
        row.sectionName?.trim() ?? "";
      const subjectName =
        row.subjectName?.trim() ?? "";

      const examDate = parseDate(
        row.examDate ?? "",
      );

      const maxMarks = Number(row.maxMarks);

      const passMarks =
        row.passMarks === "" ||
        row.passMarks == null
          ? null
          : Number(row.passMarks);

      if (
        !examName ||
        !academicYear ||
        !className ||
        !subjectName
      ) {
        throw new Error(
          `Row ${rowNumber}: Exam, academic year, class and subject are required.`,
        );
      }

      if (!examDate) {
        throw new Error(
          `Row ${rowNumber}: Invalid exam date. Use YYYY-MM-DD.`,
        );
      }

      if (
        row.startTime &&
        !isValidTime(row.startTime)
      ) {
        throw new Error(
          `Row ${rowNumber}: Start time must be HH:MM.`,
        );
      }

      if (
        row.endTime &&
        !isValidTime(row.endTime)
      ) {
        throw new Error(
          `Row ${rowNumber}: End time must be HH:MM.`,
        );
      }

      if (
        row.startTime &&
        row.endTime &&
        row.endTime <= row.startTime
      ) {
        throw new Error(
          `Row ${rowNumber}: End time must be after start time.`,
        );
      }

      if (
        !Number.isFinite(maxMarks) ||
        maxMarks <= 0
      ) {
        throw new Error(
          `Row ${rowNumber}: Max marks must be greater than 0.`,
        );
      }

      if (
        passMarks !== null &&
        (
          !Number.isFinite(passMarks) ||
          passMarks < 0 ||
          passMarks > maxMarks
        )
      ) {
        throw new Error(
          `Row ${rowNumber}: Pass marks must be between 0 and max marks.`,
        );
      }

      const duplicateKey = [
        examName,
        academicYear,
        className,
        sectionName,
        subjectName,
      ]
        .map(normalize)
        .join(":");

      if (seen.has(duplicateKey)) {
        throw new Error(
          `Duplicate schedule in import at row ${rowNumber}.`,
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
        examDate,
        maxMarks,
        passMarks,
      });
    }

    /*
     * STEP 2
     * Load only records belonging to
     * the current school.
     */
    const [
      academicYears,
      exams,
      classes,
      subjects,
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
          startDate: true,
          endDate: true,
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

      prisma.subject.findMany({
        where: {
          schoolId: tenant.schoolId,
        },
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    const yearByName = new Map(
      academicYears.map((year) => [
        normalize(year.name),
        year,
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

    const examByKey = new Map(
      exams.map((exam) => [
        `${exam.academicYearId}:${normalize(exam.name)}`,
        exam,
      ]),
    );

    /*
     * STEP 3
     * Resolve names and verify relationships.
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
       *
       * The exam is already restricted to
       * tenant.schoolId.
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
       * Exam date must be inside the
       * exam's configured period.
       */
      if (
        exam.startDate &&
        dateOnly(row.examDate) <
          dateOnly(exam.startDate)
      ) {
        throw new Error(
          `Row ${rowNumber}: Exam date is before the exam start date.`,
        );
      }

      if (
        exam.endDate &&
        dateOnly(row.examDate) >
          dateOnly(exam.endDate)
      ) {
        throw new Error(
          `Row ${rowNumber}: Exam date is after the exam end date.`,
        );
      }

      /*
       * Class
       *
       * classByName contains only classes
       * belonging to this school.
       */
      const classRecord = classByName.get(
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
       * IMPORTANT:
       * Section belongs to Class, not directly
       * to School.
       *
       * Therefore we resolve the section through
       * classRecord.id.
       */
      let sectionId: string | null = null;

      if (row.sectionName) {
        const section =
          await prisma.section.findFirst({
            where: {
              classId: classRecord.id,
              name: row.sectionName,
            },
            select: {
              id: true,
              classId: true,
            },
          });

        if (!section) {
          throw new Error(
            `Row ${rowNumber}: Section ${row.sectionName} not found in ${row.className}.`,
          );
        }

        /*
         * Defensive relationship check.
         */
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
       *
       * subjectByName contains only subjects
       * belonging to this school.
       */
      const subject = subjectByName.get(
        normalize(row.subjectName),
      );

      if (!subject) {
        throw new Error(
          `Row ${rowNumber}: Subject not found: ${row.subjectName}.`,
        );
      }

      resolved.push({
        schoolId: tenant.schoolId,
        examId: exam.id,
        classId: classRecord.id,
        sectionId,
        subjectId: subject.id,
        examDate: row.examDate,
        startTime:
          row.startTime || null,
        endTime:
          row.endTime || null,
        maxMarks: row.maxMarks,
        passMarks: row.passMarks,
      });
    }

    /*
     * STEP 4
     * Check existing schedules.
     */
    const existing =
      await prisma.examSchedule.findMany({
        where: {
          schoolId: tenant.schoolId,

          OR: resolved.map(
            (row) => ({
              examId: row.examId,
              classId: row.classId,
              sectionId: row.sectionId,
              subjectId: row.subjectId,
            }),
          ),
        },

        select: {
          id: true,
          examId: true,
          classId: true,
          sectionId: true,
          subjectId: true,
        },
      });

    if (existing.length > 0) {
      throw new Error(
        "One or more exam schedules already exist for the selected exam, class, section and subject.",
      );
    }

    /*
     * STEP 5
     * Create everything in one transaction.
     */
    await prisma.$transaction(
      resolved.map((row) =>
        prisma.examSchedule.create({
          data: {
            schoolId:
              row.schoolId,

            examId:
              row.examId,

            classId:
              row.classId,

            sectionId:
              row.sectionId,

            subjectId:
              row.subjectId,

            examDate:
              row.examDate,

            startTime:
              row.startTime,

            endTime:
              row.endTime,

            maxMarks:
              row.maxMarks,

            passMarks:
              row.passMarks,
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
      "Exam schedules imported successfully.",
    );
  });
}