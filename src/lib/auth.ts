import { currentUser } from "@clerk/nextjs/server";
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
    include: {
      memberships: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const membership = user.memberships.find((m) => m.isActive);

  if (!membership) {
    throw new Error("No active membership");
  }

  return membership;
}