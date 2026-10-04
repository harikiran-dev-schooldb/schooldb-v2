import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

import {
  bulkStudentUpdatesSchema,
  bulkStudentsSchema,
  type BulkStudentRow,
  type BulkStudentUpdateField,
} from "../schemas/bulk-student.schema";
import { updateStudentFieldsSchema } from "../schemas/student.schema";
import { syncStudentRteWaivers } from "@/features/student-fees/services/rte-waiver.service";

type EnrollmentInput = Pick<
  BulkStudentRow,
  "academicYear" | "className" | "sectionName" | "rollNo"
>;

type StudentProfile = Omit<BulkStudentRow, keyof EnrollmentInput>;

type EnrollmentPlan = {
  academicYearId: string;
  classId: string;
  sectionId: string;
  rollNo: number | null;
  academicYearName: string;
  className: string;
  sectionName: string;
};

type ImportResult = {
  row: number;
  status: "created" | "skipped" | "failed";
  admissionNo: string;
  message?: string;
};

const BOOLEAN_UPDATE_FIELDS = new Set<BulkStudentUpdateField>([
  "isRte",
  "hostelRequired",
  "transportRequired",
  "whatsappOptIn",
]);
const UPPERCASE_UPDATE_FIELDS = new Set<BulkStudentUpdateField>([
  "gender",
  "status",
  "religion",
  "category",
]);

function normalizeUpdateValue(field: BulkStudentUpdateField, value: unknown) {
  const text = String(value ?? "").trim();

  if (BOOLEAN_UPDATE_FIELDS.has(field)) {
    const normalized = text.toUpperCase();
    if (["TRUE", "YES", "1"].includes(normalized)) return true;
    if (["FALSE", "NO", "0"].includes(normalized)) return false;
    return value;
  }

  if (field === "dob" || field === "joinedDate") {
    if (text === "" && field === "joinedDate") return text;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) return value;

    const [, year, month, day] = match;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return date.getUTCFullYear() === Number(year) &&
      date.getUTCMonth() === Number(month) - 1 &&
      date.getUTCDate() === Number(day)
      ? text
      : "INVALID_DATE";
  }

  if (UPPERCASE_UPDATE_FIELDS.has(field)) {
    return text === "" && (field === "religion" || field === "category")
      ? null
      : text.toUpperCase();
  }

  return text;
}

export const studentBulkService = {
  async updateFields(schoolId: string, input: unknown, performedByUserId?: string) {
    const { fields, students } = bulkStudentUpdatesSchema.parse(input);
    const errors: Array<{ row: number; message: string }> = [];
    const seen = new Set<string>();

    for (const [index, student] of students.entries()) {
      const key = student.admissionNo.toLowerCase();
      if (seen.has(key)) {
        errors.push({
          row: index + 2,
          message: `Duplicate admission number: ${student.admissionNo}.`,
        });
      }
      seen.add(key);
    }

    if (errors.length > 0) {
      return { updated: 0, failed: errors.length, errors };
    }

    const existing = await prisma.student.findMany({
      where: {
        schoolId,
        admissionNo: { in: students.map((student) => student.admissionNo) },
      },
      select: {
        id: true,
        admissionNo: true,
        fullName: true,
        whatsappOptInAt: true,
      },
    });
    const existingByAdmissionNo = new Map(
      existing.map((student) => [student.admissionNo, student]),
    );
    const changes: Array<{
      id: string;
      admissionNo: string;
      fullName: string | null;
      data: Prisma.StudentUpdateInput;
      isRte?: boolean;
    }> = [];

    for (const [index, requested] of students.entries()) {
      const student = existingByAdmissionNo.get(requested.admissionNo);
      if (!student) {
        errors.push({
          row: index + 2,
          message: `Student not found for admission number ${requested.admissionNo}.`,
        });
        continue;
      }

      const rawPatch = Object.fromEntries(
        fields.map((field) => [
          field,
          normalizeUpdateValue(field, requested[field]),
        ]),
      );
      const parsedPatch = updateStudentFieldsSchema.safeParse(rawPatch);

      if (!parsedPatch.success) {
        errors.push({
          row: index + 2,
          message: parsedPatch.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; "),
        });
        continue;
      }

      const data = Object.fromEntries(
        fields.map((field) => [field, parsedPatch.data[field]]),
      ) as Prisma.StudentUpdateInput;

      if (fields.includes("dob") && parsedPatch.data.dob) {
        data.dob = new Date(`${parsedPatch.data.dob}T00:00:00`);
      }
      if (fields.includes("joinedDate")) {
        data.joinedDate = parsedPatch.data.joinedDate
          ? new Date(`${parsedPatch.data.joinedDate}T00:00:00`)
          : null;
      }
      if (fields.includes("whatsappOptIn")) {
        data.whatsappOptInAt = parsedPatch.data.whatsappOptIn
          ? student.whatsappOptInAt ?? new Date()
          : null;
      }

      changes.push({
        ...student,
        data,
        isRte: fields.includes("isRte") ? parsedPatch.data.isRte : undefined,
      });
    }

    if (errors.length > 0) {
      return { updated: 0, failed: errors.length, errors };
    }

    if (changes.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const student of changes) {
          await tx.student.update({
            where: { id: student.id, schoolId },
            data: student.data,
          });

          if (student.isRte !== undefined) {
            await syncStudentRteWaivers(
              tx,
              schoolId,
              student.id,
              student.isRte,
            );
          }
        }

        await tx.studentActivity.createMany({
          data: changes.map((student) => ({
            schoolId,
            studentId: student.id,
            type: "PROFILE_UPDATED" as const,
            title: "Student profile updated",
            description: `${student.fullName ?? student.admissionNo} was updated through bulk import. Fields: ${fields.join(", ")}.`,
            performedByUserId,
            metadata: { fields },
          })),
        });
      }, {
        maxWait: 5_000,
        timeout: 120_000,
      });
    }

    return {
      updated: changes.length,
      failed: 0,
      errors,
    };
  },

  async import(schoolId: string, input: unknown, performedByUserId?: string) {
    const parsed = bulkStudentsSchema.parse(input);
    const results: ImportResult[] = [];
    const seen = new Set<string>();
    const candidates: Array<{
      row: number;
      student: StudentProfile;
      enrollmentInput: EnrollmentInput;
    }> = [];

    for (const [index, importedStudent] of parsed.students.entries()) {
      const row = index + 2;
      const {
        academicYear,
        className,
        sectionName,
        rollNo,
        ...student
      } = importedStudent;

      if (seen.has(student.admissionNo)) {
        results.push({
          row,
          status: "failed",
          admissionNo: student.admissionNo,
          message: "Duplicate admission number in the import file.",
        });
        continue;
      }

      seen.add(student.admissionNo);
      candidates.push({
        row,
        student,
        enrollmentInput: { academicYear, className, sectionName, rollNo },
      });
    }

    const existing = await prisma.student.findMany({
      where: {
        schoolId,
        admissionNo: {
          in: candidates.map(({ student }) => student.admissionNo),
        },
      },
      select: { admissionNo: true },
    });
    const existingAdmissionNos = new Set(
      existing.map((student) => student.admissionNo),
    );
    const eligible = candidates.filter(({ row, student }) => {
      if (!existingAdmissionNos.has(student.admissionNo)) return true;

      results.push({
        row,
        status: "skipped",
        admissionNo: student.admissionNo,
        message: "Admission number already exists; row skipped.",
      });
      return false;
    });

    const [academicYears, classes] = await Promise.all([
      prisma.academicYear.findMany({
        where: { schoolId },
        select: { id: true, name: true },
      }),
      prisma.class.findMany({
        where: { schoolId, active: true },
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
    const academicYearByName = new Map(
      academicYears.map((item) => [item.name.trim().toLowerCase(), item]),
    );
    const classByName = new Map(
      classes.map((item) => [item.name.trim().toLowerCase(), item]),
    );
    const rollKeysInFile = new Set<string>();
    const prepared: Array<
      (typeof eligible)[number] & { enrollment: EnrollmentPlan | null }
    > = [];

    for (const candidate of eligible) {
      const { row, student, enrollmentInput } = candidate;
      if (!enrollmentInput.academicYear) {
        prepared.push({ ...candidate, enrollment: null });
        continue;
      }

      const academicYear = academicYearByName.get(
        enrollmentInput.academicYear.toLowerCase(),
      );
      if (!academicYear) {
        results.push({
          row,
          status: "failed",
          admissionNo: student.admissionNo,
          message: `Academic year not found: ${enrollmentInput.academicYear}.`,
        });
        continue;
      }

      const schoolClass = classByName.get(
        enrollmentInput.className!.toLowerCase(),
      );
      if (!schoolClass) {
        results.push({
          row,
          status: "failed",
          admissionNo: student.admissionNo,
          message: `Class not found: ${enrollmentInput.className}.`,
        });
        continue;
      }

      const section = schoolClass.sections.find(
        (item) =>
          item.name.trim().toLowerCase() ===
          enrollmentInput.sectionName!.toLowerCase(),
      );
      if (!section) {
        results.push({
          row,
          status: "failed",
          admissionNo: student.admissionNo,
          message: `Section ${enrollmentInput.sectionName} not found under ${schoolClass.name}.`,
        });
        continue;
      }

      const enrollment: EnrollmentPlan = {
        academicYearId: academicYear.id,
        classId: schoolClass.id,
        sectionId: section.id,
        rollNo: enrollmentInput.rollNo,
        academicYearName: academicYear.name,
        className: schoolClass.name,
        sectionName: section.name,
      };

      if (enrollment.rollNo !== null) {
        const rollKey = `${enrollment.academicYearId}:${enrollment.classId}:${enrollment.sectionId}:${enrollment.rollNo}`;
        if (rollKeysInFile.has(rollKey)) {
          results.push({
            row,
            status: "failed",
            admissionNo: student.admissionNo,
            message: `Roll number ${enrollment.rollNo} is repeated for that academic year, class, and section.`,
          });
          continue;
        }
        rollKeysInFile.add(rollKey);
      }

      prepared.push({ ...candidate, enrollment });
    }

    const plannedEnrollments = prepared.filter(
      (item): item is typeof item & { enrollment: EnrollmentPlan } =>
        item.enrollment !== null,
    );
    const existingRolls = plannedEnrollments.length
      ? await prisma.studentEnrollment.findMany({
          where: {
            schoolId,
            academicYearId: {
              in: plannedEnrollments.map(
                (item) => item.enrollment.academicYearId,
              ),
            },
            rollNo: { not: null },
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
      existingRolls.map(
        (item) =>
          `${item.academicYearId}:${item.classId}:${item.sectionId}:${item.rollNo}`,
      ),
    );
    const importable = prepared.filter(({ row, student, enrollment }) => {
      if (
        !enrollment ||
        enrollment.rollNo === null ||
        !existingRollKeys.has(
          `${enrollment.academicYearId}:${enrollment.classId}:${enrollment.sectionId}:${enrollment.rollNo}`,
        )
      ) {
        return true;
      }

      results.push({
        row,
        status: "failed",
        admissionNo: student.admissionNo,
        message: `Roll number ${enrollment.rollNo} already exists in ${enrollment.className} — ${enrollment.sectionName} for ${enrollment.academicYearName}.`,
      });
      return false;
    });

    if (importable.length === 0) {
      const ordered = results.toSorted((a, b) => a.row - b.row);
      return {
        created: 0,
        skipped: ordered.filter((item) => item.status === "skipped").length,
        failed: ordered.filter((item) => item.status === "failed").length,
        enrolled: 0,
        errors: ordered
          .filter((item) => item.status === "failed")
          .map((item) => ({
            row: item.row,
            message: `${item.admissionNo}: ${item.message}`,
          })),
      };
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
      const created = await tx.student.createManyAndReturn({
        data: importable.map(({ student }) => ({
          schoolId,
          ...student,
          dob: new Date(`${student.dob}T00:00:00`),
          joinedDate: student.joinedDate
            ? new Date(`${student.joinedDate}T00:00:00`)
            : null,
          whatsappOptInAt: student.whatsappOptIn ? new Date() : null,
          username: `STD_${student.admissionNo}`,
        })),
        skipDuplicates: true,
        select: { id: true, admissionNo: true, fullName: true },
      });

      if (created.length > 0) {
        await tx.studentActivity.createMany({
          data: created.map((student) => ({
            schoolId,
            studentId: student.id,
            type: "STUDENT_CREATED",
            title: "Student profile created",
            description: `Student ${student.admissionNo} — ${student.fullName} was added to SchoolDB.`,
            performedByUserId,
          })),
        });
      }

      const studentByAdmissionNo = new Map(
        created.map((student) => [student.admissionNo, student]),
      );
      const enrollmentRows = importable.flatMap(({ student, enrollment }) => {
        const createdStudent = studentByAdmissionNo.get(student.admissionNo);
        if (!createdStudent || !enrollment) return [];

        return [
          {
            schoolId,
            studentId: createdStudent.id,
            academicYearId: enrollment.academicYearId,
            classId: enrollment.classId,
            sectionId: enrollment.sectionId,
            rollNo: enrollment.rollNo,
            admissionDate: student.joinedDate
              ? new Date(`${student.joinedDate}T00:00:00`)
              : null,
            active: true,
          },
        ];
      });

      if (enrollmentRows.length > 0) {
        await tx.studentEnrollment.createMany({ data: enrollmentRows });
        await tx.studentActivity.createMany({
          data: importable.flatMap(({ student, enrollment }) => {
            const createdStudent = studentByAdmissionNo.get(
              student.admissionNo,
            );
            if (!createdStudent || !enrollment) return [];

            return [
              {
                schoolId,
                studentId: createdStudent.id,
                type: "ENROLLMENT_CREATED" as const,
                title: "Student enrollment created",
                description: `${student.fullName} enrolled in ${enrollment.className} — ${enrollment.sectionName} for ${enrollment.academicYearName}.`,
                performedByUserId,
              },
            ];
          }),
        });
      }

      return { created, enrolled: enrollmentRows.length };
    });

    const createdStudents = transactionResult.created;

    const createdAdmissionNos = new Set(
      createdStudents.map((student) => student.admissionNo),
    );

    for (const { row, student } of importable) {
      const wasCreated = createdAdmissionNos.has(student.admissionNo);
      results.push({
        row,
        status: wasCreated ? "created" : "skipped",
        admissionNo: student.admissionNo,
        ...(wasCreated
          ? {}
          : { message: "Admission number already exists; row skipped." }),
      });
    }

    const ordered = results.toSorted((a, b) => a.row - b.row);
    const created = ordered.filter((item) => item.status === "created").length;
    const skipped = ordered.filter((item) => item.status === "skipped").length;
    const failed = ordered.filter((item) => item.status === "failed").length;

    return {
      created,
      skipped,
      failed,
      enrolled: transactionResult.enrolled,
      errors: ordered
        .filter((item) => item.status === "failed")
        .map((item) => ({
          row: item.row,
          message: `${item.admissionNo}: ${item.message}`,
        })),
    };
  },
};
