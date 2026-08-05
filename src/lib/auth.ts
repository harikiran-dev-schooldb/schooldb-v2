import { currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { prisma } from "./prisma";

export async function requireTenant() {
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

  const memberships = await prisma.membership.findMany({
    where: {
      userId: user.id,
      isActive: true,
    },
    include: {
      school: {
        select: {
          slug: true,
        },
      },
    },
  });

  const referer = (await headers()).get("referer");
  const schoolSlug = referer
    ? new URL(referer).pathname.split("/").filter(Boolean)[0]
    : undefined;

  const membership = schoolSlug
    ? memberships.find((item) => item.school.slug === schoolSlug)
    : memberships.length === 1
      ? memberships[0]
      : undefined;

  if (!membership) {
    throw new Error("No active membership for this school");
  }

  return membership;
}
