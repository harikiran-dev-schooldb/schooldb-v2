import { prisma } from "@/lib/prisma";
import { listAccessibleStudents } from "@/lib/student-access";
import { notificationVisibility } from "./visibility";

export async function notificationContext(schoolSlug: string) {
  const { membership, students } = await listAccessibleStudents(schoolSlug);
  const visibility = notificationVisibility(membership.schoolId, students);
  return {
    membership,
    where: {
      ...visibility,
      ...(membership.role === "PARENT"
        ? { category: { not: "BIRTHDAY" } }
        : {}),
    },
  };
}

export async function unreadNotificationCount(schoolSlug: string) {
  const { membership, where } = await notificationContext(schoolSlug);
  return prisma.announcement.count({
    where: { ...where, reads: { none: { userId: membership.userId } } },
  });
}
