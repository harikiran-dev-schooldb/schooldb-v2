import { prisma } from "@/lib/prisma";
import { runSerializableTransaction } from "@/lib/prisma-transaction";

type CreateSchoolInput = {
  name: string;
  slug: string;
};

type BootstrapAdminInput = {
  clerkUserId: string;
  email: string;
  firstName: string;
  lastName: string | null;
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
  async getBootstrapStatus() {
    const existingSuperAdmin = await prisma.membership.findFirst({
      where: {
        role: "SUPER_ADMIN",
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    return {
      superAdminExists: Boolean(existingSuperAdmin),
    };
  },

  async createSchool(
    admin: BootstrapAdminInput,
    input: CreateSchoolInput,
  ) {
    const clerkUserId = admin.clerkUserId.trim();
    const email = admin.email.trim().toLowerCase();
    const firstName = admin.firstName.trim();
    const lastName = admin.lastName?.trim() || null;
    const name = input.name.trim();
    const slug = normalizeSlug(input.slug || name);

    if (!clerkUserId.startsWith("user_")) {
      throw new Error("Enter a valid Clerk User ID.");
    }

    if (!email || !email.includes("@")) {
      throw new Error("A valid email address is required.");
    }

    if (!firstName) {
      throw new Error("First name is required.");
    }

    if (!name) {
      throw new Error("School name is required.");
    }

    if (!slug) {
      throw new Error("A valid school slug could not be generated.");
    }

    return runSerializableTransaction(async (tx) => {
      const existingSuperAdmin = await tx.membership.findFirst({
        where: { role: "SUPER_ADMIN", isActive: true },
        select: { id: true },
      });
      if (existingSuperAdmin) {
        throw new Error(
          "Initial setup has already been completed. Sign in as the existing super administrator.",
        );
      }

      const existingSchool = await tx.school.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (existingSchool) {
        throw new Error(
          "A school with this URL already exists. Please choose another school name or slug.",
        );
      }

      const existingEmailUser = await tx.user.findUnique({
        where: { email },
        select: { clerkUserId: true },
      });
      if (existingEmailUser && existingEmailUser.clerkUserId !== clerkUserId) {
        throw new Error("This email is already linked to another Clerk account.");
      }

      const user = await tx.user.upsert({
        where: { clerkUserId },
        update: { email, firstName, lastName },
        create: { clerkUserId, email, firstName, lastName },
      });
      const school = await tx.school.create({ data: { name, slug } });
      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          schoolId: school.id,
          role: "SUPER_ADMIN",
          isActive: true,
        },
      });
      return { school, user, membership };
    });
  },
};
