import { prisma } from "@/lib/prisma";

type CreateSchoolInput = {
  name: string;
  slug: string;
};

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export const schoolOnboardingService = {
  async createSchool(
    clerkUserId: string,
    email: string,
    firstName: string | null,
    lastName: string | null,
    imageUrl: string | null,
    input: CreateSchoolInput,
  ) {
    const name = input.name.trim();

    if (!name) {
      throw new Error("School name is required.");
    }

    const slug = normalizeSlug(
      input.slug || name,
    );

    if (!slug) {
      throw new Error(
        "A valid school slug could not be generated.",
      );
    }

    return prisma.$transaction(async (tx) => {
      /*
       * --------------------------------------------------------------
       * CHECK SCHOOL SLUG
       * --------------------------------------------------------------
       */

      const existingSchool =
        await tx.school.findUnique({
          where: {
            slug,
          },
          select: {
            id: true,
          },
        });

      if (existingSchool) {
        throw new Error(
          "A school with this URL already exists. Please choose another school name or slug.",
        );
      }

      /*
       * --------------------------------------------------------------
       * USER
       * --------------------------------------------------------------
       *
       * Clerk is the source of authentication.
       * Our User table stores the application-level user.
       */

      const user = await tx.user.upsert({
        where: {
          clerkUserId,
        },

        update: {
          email,
          firstName,
          lastName,
          imageUrl,
        },

        create: {
          clerkUserId,
          email,
          firstName,
          lastName,
          imageUrl,
        },
      });

      /*
       * --------------------------------------------------------------
       * SCHOOL
       * --------------------------------------------------------------
       */

      const school = await tx.school.create({
        data: {
          name,
          slug,
        },
      });

      /*
       * --------------------------------------------------------------
       * MEMBERSHIP
       * --------------------------------------------------------------
       *
       * The creator becomes SUPER_ADMIN.
       */

      const membership =
        await tx.membership.create({
          data: {
            userId: user.id,
            schoolId: school.id,
            role: "SUPER_ADMIN",
            isActive: true,
          },
        });

      return {
        school,
        user,
        membership,
      };
    });
  },
};