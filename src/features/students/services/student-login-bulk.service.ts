import { safelyProvisionStudentLogin } from "@/features/auth/account-provisioning";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const studentLoginBulkSchema = z.object({
  admissionNos: z
    .array(z.string().trim().min(1).max(100))
    .min(1, "Add at least one admission number.")
    .max(100, "Create logins for at most 100 students per request."),
});

type LoginError = {
  admissionNo: string;
  message: string;
};

export const studentLoginBulkService = {
  async provision(schoolId: string, input: unknown) {
    const parsed = studentLoginBulkSchema.parse(input);
    const admissionNos = [...new Set(parsed.admissionNos.map((value) => value.trim()))];
    const students = await prisma.student.findMany({
      where: { schoolId, admissionNo: { in: admissionNos } },
      select: {
        id: true,
        admissionNo: true,
        clerkId: true,
      },
    });
    const studentByAdmissionNo = new Map(
      students.map((student) => [student.admissionNo, student]),
    );
    const errors: LoginError[] = admissionNos
      .filter((admissionNo) => !studentByAdmissionNo.has(admissionNo))
      .map((admissionNo) => ({
        admissionNo,
        message: "Student was not found in this school.",
      }));
    const alreadyReady = students.filter((student) => student.clerkId).length;
    const pending = students.filter((student) => !student.clerkId);
    let provisioned = 0;
    let skipped = 0;
    let failed = 0;

    // Keep Clerk traffic deliberately small and bounded.
    for (let index = 0; index < pending.length; index += 5) {
      const batch = pending.slice(index, index + 5);
      const results = await Promise.all(
        batch.map(async (student) => ({
          student,
          result: await safelyProvisionStudentLogin(student.id, schoolId),
        })),
      );

      for (const { student, result } of results) {
        if (result.status === "PROVISIONED") {
          provisioned += 1;
        } else {
          if (result.status === "SKIPPED") skipped += 1;
          if (result.status === "FAILED") failed += 1;
          errors.push({ admissionNo: student.admissionNo, message: result.message });
        }
      }
    }

    return {
      requested: admissionNos.length,
      provisioned,
      alreadyReady,
      skipped,
      failed,
      notFound: admissionNos.length - students.length,
      errors,
    };
  },
};
