import { clerkClient } from "@clerk/nextjs/server";

import { canSubmitOwnProfileImage } from "@/features/settings/profile-image-policy";
import { notifyStudentProfileImageSubmitted } from "@/features/notifications/events";
import { apiHandler } from "@/lib/api";
import { requireMembership } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import {
  deletePendingProfileImage,
  savePendingProfileImage,
  validateProfileImageFile,
} from "@/lib/private-storage";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
const PROFILE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

async function linkedStudent(schoolId: string, clerkUserId: string) {
  const students = await prisma.student.findMany({
    where: { schoolId, clerkId: clerkUserId, status: "ACTIVE" },
    select: { id: true, imageUrl: true },
    take: 2,
  });
  if (students.length !== 1) {
    throw new ApiError(
      403,
      "This login must be linked to exactly one active student.",
    );
  }
  return students[0];
}

async function validateImage(file: File) {
  if (!PROFILE_IMAGE_TYPES.has(file.type)) {
    throw new ApiError(400, "Choose a JPG, PNG, or WebP image.");
  }
  if (file.size <= 0 || file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new ApiError(400, "Profile image must be smaller than 5 MB.");
  }
  try {
    await validateProfileImageFile(file);
  } catch (error) {
    throw new ApiError(
      400,
      error instanceof Error ? error.message : "Invalid profile image.",
    );
  }
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const form = await request.formData();
    const schoolSlug = String(form.get("schoolSlug") ?? "").trim();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "Choose a profile image to upload.");
    }

    const membership = await requireMembership(schoolSlug);
    if (!canSubmitOwnProfileImage(membership.role)) {
      throw new ApiError(
        403,
        "Profile image upload is not available for this account.",
      );
    }
    await validateImage(file);

    if (membership.role === "STUDENT") {
      const student = await linkedStudent(
        membership.schoolId,
        membership.user.clerkUserId,
      );
      const existing = await prisma.studentProfileImageRequest.findUnique({
        where: { studentId: student.id },
        select: { storageKey: true },
      });
      let storageKey: string;
      try {
        storageKey = await savePendingProfileImage(file);
      } catch (error) {
        throw new ApiError(
          500,
          error instanceof Error
            ? error.message
            : "Unable to store the profile image request.",
        );
      }
      const pendingRequest = await prisma.studentProfileImageRequest.upsert({
        where: { studentId: student.id },
        create: {
          schoolId: membership.schoolId,
          studentId: student.id,
          requestedByUserId: membership.userId,
          storageKey,
          mimeType: file.type,
          originalName: file.name || null,
        },
        update: {
          requestedByUserId: membership.userId,
          storageKey,
          mimeType: file.type,
          originalName: file.name || null,
        },
      });
      if (existing?.storageKey && existing.storageKey !== storageKey) {
        await deletePendingProfileImage(existing.storageKey).catch(
          () => undefined,
        );
      }
      await notifyStudentProfileImageSubmitted(
        student.id,
        membership.schoolId,
        pendingRequest.storageKey,
      ).catch((error) => {
        console.error("Unable to create student image approval notification", error);
      });
      return ApiResponse.success(
        { imageUrl: membership.user.imageUrl, pendingApproval: true },
        "Profile image submitted for approval.",
      );
    }

    const client = await clerkClient();
    const clerkUser = await client.users.updateUserProfileImage(
      membership.user.clerkUserId,
      { file },
    );

    await prisma.user.update({
      where: { id: membership.userId },
      data: { imageUrl: clerkUser.imageUrl },
    });

    return ApiResponse.success(
      { imageUrl: clerkUser.imageUrl },
      "Profile image updated.",
    );
  });
}

export async function DELETE(request: Request) {
  return apiHandler(async () => {
    const schoolSlug = new URL(request.url).searchParams.get("schoolSlug") ?? "";
    const membership = await requireMembership(schoolSlug);
    if (!canSubmitOwnProfileImage(membership.role)) {
      throw new ApiError(
        403,
        "Profile image upload is not available for this account.",
      );
    }

    if (membership.role === "STUDENT") {
      const student = await linkedStudent(
        membership.schoolId,
        membership.user.clerkUserId,
      );
      const pending = await prisma.studentProfileImageRequest.findUnique({
        where: { studentId: student.id },
        select: { id: true, storageKey: true },
      });
      if (!pending) {
        throw new ApiError(404, "No pending profile image request found.");
      }
      await prisma.studentProfileImageRequest.delete({
        where: { id: pending.id },
      });
      await deletePendingProfileImage(pending.storageKey).catch(
        () => undefined,
      );
      return ApiResponse.success(
        { imageUrl: student.imageUrl, pendingApproval: false },
        "Pending profile image request cancelled.",
      );
    }

    const client = await clerkClient();
    const clerkUser = await client.users.deleteUserProfileImage(
      membership.user.clerkUserId,
    );

    await prisma.user.update({
      where: { id: membership.userId },
      data: { imageUrl: clerkUser.imageUrl },
    });

    return ApiResponse.success(
      {
        imageUrl: clerkUser.imageUrl,
      },
      "Profile image removed.",
    );
  });
}
