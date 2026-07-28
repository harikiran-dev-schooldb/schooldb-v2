import { prisma } from "@/lib/prisma";

export async function getSchoolBySlug(slug: string) {
  return prisma.school.findUnique({
    where: {
      slug,
    },
  });
}

export async function getMembership(userId: string, schoolId: string) {
  return prisma.membership.findFirst({
    where: {
      userId,
      schoolId,
      isActive: true,
    },
    include: {
      school: true,
      user: true,
    },
  });
}