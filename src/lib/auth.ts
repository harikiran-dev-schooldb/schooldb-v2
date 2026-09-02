import { currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";

import { prisma } from "./prisma";

export async function requireTenant(schoolSlug?: string) {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: {
      clerkUserId: clerkUser.id,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const requestHeaders = await headers();
  const requestedSchoolSlug = schoolSlug ?? requestHeaders.get("x-school-slug") ?? undefined;

  const memberships = await prisma.membership.findMany({
    where: {
      userId: user.id,
      isActive: true,
      ...(requestedSchoolSlug
        ? {
            school: {
              slug: requestedSchoolSlug,
            },
          }
        : {}),
    },
    include: {
      school: true,
    },
  });

  if (memberships.length === 0) {
    throw new Error("No active membership for this school");
  }

  if (!requestedSchoolSlug && memberships.length > 1) {
    throw new Error("School context is required for users with multiple schools");
  }

  return memberships[0];
}

export async function requireRole(
  schoolSlug: string,
  allowedRoles: string[],
) {
  const membership = await requireTenant(schoolSlug);

  if (!allowedRoles.includes(membership.role)) {
    throw new Error("Forbidden");
  }

  return membership;
}
