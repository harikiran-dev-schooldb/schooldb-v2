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
  return prisma.$transaction(async (tx) => {
    const certificate = await tx.certificateIssue.create({ data: {
      schoolId,
      studentId: input.studentId,
      type: input.type,
      purpose: input.purpose,
      issuedByUserId,
      issuedByName,
      certificateNo: `${schoolSlug.toUpperCase()}/${year}/${student.admissionNo}/${token}`,
    }, select: { id: true, certificateNo: true } });
    await tx.studentActivity.create({ data: {
      schoolId, studentId: input.studentId, performedByUserId: issuedByUserId,
      type: "CERTIFICATE_ISSUED", title: "Certificate issued",
      description: `${input.type.replaceAll("_", " ")} certificate ${certificate.certificateNo} was issued.`,
      sourceType: "CERTIFICATE_ISSUE", sourceId: certificate.id,
      metadata: { certificateId: certificate.id, certificateNo: certificate.certificateNo, type: input.type },
    } });
    return certificate;
  });
}

export async function recordCertificatePrint(schoolId: string, id: string) {
  const result = await prisma.certificateIssue.updateMany({
    where: { id, schoolId, status: "ISSUED" },
    data: { printCount: { increment: 1 }, lastPrintedAt: new Date() },
  });
  if (!result.count) throw new ApiError(404, "Active certificate issue not found");
}

export async function cancelCertificateIssue(schoolId: string, id: string, cancelledByName: string, note: unknown, performedByUserId?: string) {
  const cancellationNote = z.string().trim().min(1).max(300).parse(note);
  const certificate = await prisma.certificateIssue.findFirst({
    where: { id, schoolId, status: "ISSUED" },
    select: { id: true, studentId: true, certificateNo: true, type: true },
  });
  if (!certificate) throw new ApiError(404, "Active certificate issue not found");
  await prisma.$transaction(async (tx) => {
    await tx.certificateIssue.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelledByName, cancellationNote } });
    await tx.studentActivity.create({ data: {
      schoolId, studentId: certificate.studentId, performedByUserId,
      type: "CERTIFICATE_CANCELLED", title: "Certificate cancelled",
      description: `${certificate.type.replaceAll("_", " ")} certificate ${certificate.certificateNo} was cancelled: ${cancellationNote}`,
      sourceType: "CERTIFICATE_CANCELLATION", sourceId: certificate.id,
      metadata: { certificateId: certificate.id, certificateNo: certificate.certificateNo, note: cancellationNote },
    } });
  });
}
