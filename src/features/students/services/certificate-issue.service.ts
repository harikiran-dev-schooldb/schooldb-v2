import { randomUUID } from "node:crypto";
import { z } from "zod";

import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const certificateIssueSchema = z.object({
  studentId: z.string().min(1),
  type: z.enum(["BONAFIDE", "STUDY", "TRANSFER"]),
  purpose: z.string().trim().max(300).nullable().optional().transform((value) => value || null),
});

export async function issueCertificate(schoolId: string, schoolSlug: string, issuedByUserId: string, issuedByName: string, value: unknown) {
  const input = certificateIssueSchema.parse(value);
  const student = await prisma.student.findFirst({ where: { id: input.studentId, schoolId }, select: { admissionNo: true, status: true } });
  if (!student) throw new ApiError(404, "Student not found");
  if (input.type === "TRANSFER" && student.status !== "TC_ISSUED") throw new ApiError(400, "Transfer certificate can be issued only after TC status is applied");

  const year = new Date().getFullYear();
  const token = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return prisma.certificateIssue.create({
    data: {
      schoolId,
      studentId: input.studentId,
      type: input.type,
      purpose: input.purpose,
      issuedByUserId,
      issuedByName,
      certificateNo: `${schoolSlug.toUpperCase()}/${year}/${student.admissionNo}/${token}`,
    },
    select: { id: true, certificateNo: true },
  });
}

export async function recordCertificatePrint(schoolId: string, id: string) {
  const result = await prisma.certificateIssue.updateMany({
    where: { id, schoolId, status: "ISSUED" },
    data: { printCount: { increment: 1 }, lastPrintedAt: new Date() },
  });
  if (!result.count) throw new ApiError(404, "Active certificate issue not found");
}

export async function cancelCertificateIssue(schoolId: string, id: string, cancelledByName: string, note: unknown) {
  const cancellationNote = z.string().trim().min(1).max(300).parse(note);
  const result = await prisma.certificateIssue.updateMany({
    where: { id, schoolId, status: "ISSUED" },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelledByName, cancellationNote },
  });
  if (!result.count) throw new ApiError(404, "Active certificate issue not found");
}
