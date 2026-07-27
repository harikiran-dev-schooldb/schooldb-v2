import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

export async function syncUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) return null;

  let user = await prisma.user.findUnique({
    where: {
      clerkUserId: clerkUser.id,
    },
  });

  if (user) return user;

  const school = await prisma.school.findUnique({
    where: {
      slug: "demo",
    },
  });

  if (!school) {
    throw new Error("Demo school not found");
  }

  user = await prisma.user.create({
    data: {
      clerkUserId: clerkUser.id,
      email: clerkUser.emailAddresses[0].emailAddress,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      imageUrl: clerkUser.imageUrl,

      memberships: {
        create: {
          schoolId: school.id,
          role: "SUPER_ADMIN",
        },
      },
    },
  });

  return user;
}