import { prisma } from "@/lib/prisma";
import { safelyProvisionStudentLogin } from "@/features/auth/account-provisioning";

import {
  bulkStudentsSchema,
  type BulkStudentRow,
} from "../schemas/bulk-student.schema";

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
  status: "created" | "failed";
  admissionNo: string;
  message?: string;
};

export const studentBulkService = {
  async import(schoolId: string, input: unknown) {
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
        status: "failed",
        admissionNo: student.admissionNo,
        message: "Admission number already exists.",
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
        failed: ordered.length,
        enrolled: 0,
        loginProvisioned: 0,
        loginPending: 0,
        errors: ordered.map((item) => ({
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

    const loginResults = [];
    for (let index = 0; index < createdStudents.length; index += 5) {
      const batch = createdStudents.slice(index, index + 5);
      loginResults.push(...await Promise.all(
        batch.map((student) => safelyProvisionStudentLogin(student.id, schoolId)),
      ));
    }

    for (const { row, student } of importable) {
      const wasCreated = createdAdmissionNos.has(student.admissionNo);
      results.push({
        row,
        status: wasCreated ? "created" : "failed",
        admissionNo: student.admissionNo,
        ...(wasCreated
          ? {}
          : { message: "Admission number was created by another request." }),
      });
    }

    const ordered = results.toSorted((a, b) => a.row - b.row);
    const created = ordered.filter((item) => item.status === "created").length;
    const failed = ordered.length - created;

    return {
      created,
      failed,
      enrolled: transactionResult.enrolled,
      loginProvisioned: loginResults.filter((result) => result.status === "PROVISIONED").length,
      loginPending: loginResults.filter((result) => result.status === "FAILED").length,
      errors: ordered
        .filter((item) => item.status === "failed")
        .map((item) => ({
          row: item.row,
          message: `${item.admissionNo}: ${item.message}`,
        })),
    };
  },
};
