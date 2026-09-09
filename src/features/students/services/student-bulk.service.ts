import { prisma } from "@/lib/prisma";
import { safelyProvisionStudentLogin } from "@/features/auth/account-provisioning";

import { bulkStudentsSchema } from "../schemas/bulk-student.schema";

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
      student: (typeof parsed.students)[number];
    }> = [];

    for (const [index, student] of parsed.students.entries()) {
      const row = index + 2;

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
      candidates.push({ row, student });
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

    const createdStudents = await prisma.$transaction(async (tx) => {
      const created = await tx.student.createManyAndReturn({
        data: eligible.map(({ student }) => ({
          schoolId,
          admissionNo: student.admissionNo,
          fullName: student.fullName,
          gender: student.gender,
          dob: new Date(`${student.dob}T00:00:00`),
          phone: student.phone,
          email: student.email || null,
          username: `STD_${student.admissionNo}`,
          status: student.status,
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

      return created;
    });

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

    for (const { row, student } of eligible) {
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
