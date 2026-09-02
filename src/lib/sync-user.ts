import { currentUser } from "@clerk/nextjs/server";

import { prisma } from "./prisma";

export async function syncUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new Error("Authenticated Clerk user has no email address");
  }

  const user = await prisma.user.findUnique({
    where: {
      clerkUserId: clerkUser.id,
    },
    include: {
      memberships: {
        where: {
          isActive: true,
        },
        include: {
          school: true,
        },
      },
    },
  });

  if (user) return user;

  return prisma.user.create({
    data: {
      clerkUserId: clerkUser.id,
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      imageUrl: clerkUser.imageUrl,
    },
    include: {
      memberships: {
        where: {
          isActive: true,
        },
        include: {
          school: true,
        },
      },
    },
  });
}
