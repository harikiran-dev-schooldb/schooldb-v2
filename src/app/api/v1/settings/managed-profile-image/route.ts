import { z } from "zod";

import {
  ProfileImageTarget,
  publishManagedProfileImage,
  removeManagedProfileImage,
} from "@/features/settings/profile-image.service";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { ApiError } from "@/lib/errors";
import { validateProfileImageFile } from "@/lib/private-storage";
import { ApiResponse } from "@/lib/response";

const targetSchema = z.object({
  schoolSlug: z.string().trim().min(1),
  targetType: z.enum(["STUDENT", "TEACHER"]),
  targetId: z.string().trim().min(1),
});

export async function POST(request: Request) {
  return apiHandler(async () => {
    const form = await request.formData();
    const target = targetSchema.parse({
      schoolSlug: form.get("schoolSlug"),
      targetType: form.get("targetType"),
      targetId: form.get("targetId"),
    });
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "Choose a profile image to upload.");
    }
    const membership = await requireRole(
      ["SUPER_ADMIN", "SCHOOL_ADMIN"],
      target.schoolSlug,
    );
    try {
      await validateProfileImageFile(file);
    } catch (error) {
      throw new ApiError(
        400,
        error instanceof Error ? error.message : "Invalid profile image.",
      );
    }
    const result = await publishManagedProfileImage({
      schoolId: membership.schoolId,
      targetType: target.targetType,
      targetId: target.targetId,
      file,
    });
    await recordAuditLog({
      actor: membership,
      module: target.targetType === "STUDENT" ? "STUDENTS" : "STAFF",
      action: "UPDATE",
      entityType: target.targetType,
      entityId: target.targetId,
      summary: `Updated ${result.name}'s profile image.`,
    });
    return ApiResponse.success(
      { imageUrl: result.imageUrl },
      "Profile image updated.",
    );
  });
}

export async function DELETE(request: Request) {
  return apiHandler(async () => {
    const url = new URL(request.url);
    const target = targetSchema.parse({
      schoolSlug: url.searchParams.get("schoolSlug"),
      targetType: url.searchParams.get("targetType"),
      targetId: url.searchParams.get("targetId"),
    });
    const membership = await requireRole(
      ["SUPER_ADMIN", "SCHOOL_ADMIN"],
      target.schoolSlug,
    );
    await removeManagedProfileImage({
      schoolId: membership.schoolId,
      targetType: target.targetType as ProfileImageTarget,
      targetId: target.targetId,
    });
    await recordAuditLog({
      actor: membership,
      module: target.targetType === "STUDENT" ? "STUDENTS" : "STAFF",
      action: "UPDATE",
      entityType: target.targetType,
      entityId: target.targetId,
      summary: `Removed a ${target.targetType.toLowerCase()} profile image.`,
    });
    return ApiResponse.success({ imageUrl: null }, "Profile image removed.");
  });
}
