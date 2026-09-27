import { publishManagedProfileImage } from "@/features/settings/profile-image.service";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import {
  deletePendingProfileImage,
  readPendingProfileImage,
} from "@/lib/private-storage";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

type Context = { params: Promise<{ requestId: string }> };

async function authorizedRequest(request: Request, context: Context) {
  const schoolSlug = new URL(request.url).searchParams.get("schoolSlug") ?? "";
  const membership = await requireRole(
    ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    schoolSlug,
  );
  const { requestId } = await context.params;
  const imageRequest = await prisma.studentProfileImageRequest.findFirst({
    where: { id: requestId, schoolId: membership.schoolId },
    include: { student: { select: { id: true, fullName: true, admissionNo: true } } },
  });
  if (!imageRequest) throw new ApiError(404, "Profile image request not found.");
  return { membership, imageRequest };
}

export async function PATCH(request: Request, context: Context) {
  return apiHandler(async () => {
    const { membership, imageRequest } = await authorizedRequest(
      request,
      context,
    );
    const contents = await readPendingProfileImage(imageRequest.storageKey);
    const file = new File(
      [new Uint8Array(contents)],
      imageRequest.originalName || "student-profile-image",
      { type: imageRequest.mimeType },
    );
    const result = await publishManagedProfileImage({
      schoolId: membership.schoolId,
      targetType: "STUDENT",
      targetId: imageRequest.studentId,
      file,
    });
    await prisma.studentProfileImageRequest.delete({
      where: { id: imageRequest.id },
    });
    await deletePendingProfileImage(imageRequest.storageKey).catch(
      () => undefined,
    );
    await recordAuditLog({
      actor: membership,
      module: "STUDENTS",
      action: "UPDATE",
      entityType: "STUDENT",
      entityId: imageRequest.studentId,
      summary: `Approved ${result.name}'s profile image.`,
    });
    return ApiResponse.success(
      { imageUrl: result.imageUrl },
      "Student profile image approved.",
    );
  });
}

export async function DELETE(request: Request, context: Context) {
  return apiHandler(async () => {
    const { membership, imageRequest } = await authorizedRequest(
      request,
      context,
    );
    await prisma.studentProfileImageRequest.delete({
      where: { id: imageRequest.id },
    });
    await deletePendingProfileImage(imageRequest.storageKey).catch(
      () => undefined,
    );
    const studentName =
      imageRequest.student.fullName || imageRequest.student.admissionNo;
    await recordAuditLog({
      actor: membership,
      module: "STUDENTS",
      action: "DELETE",
      entityType: "STUDENT",
      entityId: imageRequest.studentId,
      summary: `Rejected ${studentName}'s profile image request.`,
    });
    return ApiResponse.success(null, "Student profile image rejected.");
  });
}
