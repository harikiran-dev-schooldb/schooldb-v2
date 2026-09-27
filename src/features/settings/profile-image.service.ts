import { clerkClient } from "@clerk/nextjs/server";

import { ApiError } from "@/lib/errors";
import {
  deletePublishedProfileImage,
  savePublicProfileImage,
} from "@/lib/private-storage";
import { prisma } from "@/lib/prisma";

export type ProfileImageTarget = "STUDENT" | "TEACHER";

async function publishFile(
  file: File,
  schoolId: string,
  targetType: ProfileImageTarget,
  targetId: string,
  clerkId: string | null,
) {
  if (clerkId) {
    const client = await clerkClient();
    const user = await client.users.updateUserProfileImage(clerkId, { file });
    return user.imageUrl;
  }
  return savePublicProfileImage(
    file,
    `profile-images/${schoolId}/${targetType.toLowerCase()}/${targetId}`,
  );
}

async function updateLinkedUser(clerkId: string | null, imageUrl: string | null) {
  if (!clerkId) return;
  await prisma.user.updateMany({
    where: { clerkUserId: clerkId },
    data: { imageUrl },
  });
}

export async function publishManagedProfileImage({
  schoolId,
  targetType,
  targetId,
  file,
}: {
  schoolId: string;
  targetType: ProfileImageTarget;
  targetId: string;
  file: File;
}) {
  if (targetType === "STUDENT") {
    const student = await prisma.student.findFirst({
      where: { id: targetId, schoolId },
      select: {
        id: true,
        clerkId: true,
        imageUrl: true,
        fullName: true,
        admissionNo: true,
      },
    });
    if (!student) throw new ApiError(404, "Student not found");
    const imageUrl = await publishFile(
      file,
      schoolId,
      targetType,
      student.id,
      student.clerkId,
    );
    await prisma.student.update({
      where: { id: student.id },
      data: { imageUrl },
    });
    await updateLinkedUser(student.clerkId, imageUrl);
    await deletePublishedProfileImage(student.imageUrl).catch(() => undefined);
    return {
      imageUrl,
      name: student.fullName || student.admissionNo,
    };
  }

  const teacher = await prisma.teacher.findFirst({
    where: { id: targetId, schoolId },
    select: { id: true, clerkId: true, imageUrl: true, fullName: true },
  });
  if (!teacher) throw new ApiError(404, "Teacher not found");
  const imageUrl = await publishFile(
    file,
    schoolId,
    targetType,
    teacher.id,
    teacher.clerkId,
  );
  await prisma.teacher.update({
    where: { id: teacher.id },
    data: { imageUrl },
  });
  await updateLinkedUser(teacher.clerkId, imageUrl);
  await deletePublishedProfileImage(teacher.imageUrl).catch(() => undefined);
  return { imageUrl, name: teacher.fullName };
}

export async function removeManagedProfileImage({
  schoolId,
  targetType,
  targetId,
}: {
  schoolId: string;
  targetType: ProfileImageTarget;
  targetId: string;
}) {
  const target =
    targetType === "STUDENT"
      ? await prisma.student.findFirst({
          where: { id: targetId, schoolId },
          select: { id: true, clerkId: true, imageUrl: true },
        })
      : await prisma.teacher.findFirst({
          where: { id: targetId, schoolId },
          select: { id: true, clerkId: true, imageUrl: true },
        });
  if (!target) {
    throw new ApiError(
      404,
      `${targetType === "STUDENT" ? "Student" : "Teacher"} not found`,
    );
  }

  if (target.clerkId) {
    const client = await clerkClient();
    const user = await client.users.deleteUserProfileImage(target.clerkId);
    await updateLinkedUser(target.clerkId, user.imageUrl);
  }
  if (targetType === "STUDENT") {
    await prisma.student.update({
      where: { id: target.id },
      data: { imageUrl: null },
    });
  } else {
    await prisma.teacher.update({
      where: { id: target.id },
      data: { imageUrl: null },
    });
  }
  await deletePublishedProfileImage(target.imageUrl).catch(() => undefined);
}
