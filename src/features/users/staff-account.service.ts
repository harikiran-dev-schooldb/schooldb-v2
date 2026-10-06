import { z } from "zod";

import { provisionStaffLogin } from "@/features/auth/account-provisioning";
import { normalizeIndianMobile } from "@/features/auth/otp";
import { STAFF_ACCOUNT_ROLES } from "@/features/users/staff-account-policy";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { normalizeStaffPermissions } from "@/lib/staff-permissions";

const presetSchema = z.enum([
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VICE_PRINCIPAL",
  "ACCOUNTANT",
  "RECEPTIONIST",
]);

const editableRoleSchema = z.enum([
  "SCHOOL_ADMIN",
  "TEACHER",
  "ACCOUNTANT",
  "RECEPTIONIST",
]);

export const createStaffAccountSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => Boolean(normalizeIndianMobile(value)),
      "Enter a valid Indian mobile number.",
    ),
  preset: presetSchema,
});

export const updateStaffAccountSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => Boolean(normalizeIndianMobile(value)),
      "Enter a valid Indian mobile number.",
    ),
  designation: z.string().trim().min(2).max(100),
  role: editableRoleSchema,
  active: z.boolean(),
});

const presetAccess = {
  SCHOOL_ADMIN: { role: "SCHOOL_ADMIN", designation: "School Administrator" },
  PRINCIPAL: { role: "SCHOOL_ADMIN", designation: "Principal" },
  VICE_PRINCIPAL: { role: "SCHOOL_ADMIN", designation: "Vice Principal" },
  ACCOUNTANT: { role: "ACCOUNTANT", designation: "Accountant" },
  RECEPTIONIST: { role: "RECEPTIONIST", designation: "Receptionist" },
} as const;

async function assertPhoneAvailable(
  schoolId: string,
  phone: string,
  excludeMembershipId?: string,
) {
  const digits = normalizeIndianMobile(phone);
  if (!digits) throw new ApiError(400, "Enter a valid Indian mobile number.");

  const duplicate = await prisma.membership.findFirst({
    where: {
      schoolId,
      ...(excludeMembershipId ? { id: { not: excludeMembershipId } } : {}),
      role: { in: [...STAFF_ACCOUNT_ROLES] },
      user: { phone: { endsWith: digits } },
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new ApiError(
      409,
      "Another staff account already uses this mobile number in this school.",
    );
  }

  return digits;
}

export async function createStaffAccount(
  schoolId: string,
  schoolSlug: string,
  actorRole: string,
  value: unknown,
) {
  const input = createStaffAccountSchema.parse(value);
  const access = presetAccess[input.preset];

  if (actorRole !== "SUPER_ADMIN" && access.role === "SCHOOL_ADMIN") {
    throw new ApiError(
      403,
      "Only a super administrator can create school administrators or principals.",
    );
  }

  await assertPhoneAvailable(schoolId, input.phone);

  return provisionStaffLogin({
    schoolId,
    schoolSlug,
    displayName: input.fullName,
    phone: input.phone,
    role: access.role,
    designation: access.designation,
  });
}

export async function updateStaffAccount(
  schoolId: string,
  schoolSlug: string,
  membershipId: string,
  actorUserId: string,
  actorRole: string,
  value: unknown,
) {
  if (actorRole !== "SUPER_ADMIN") {
    throw new ApiError(403, "Only a super administrator can edit staff users.");
  }

  const input = updateStaffAccountSchema.parse(value);
  const account = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      schoolId,
      role: { in: [...STAFF_ACCOUNT_ROLES] },
    },
    select: {
      id: true,
      userId: true,
      role: true,
      user: {
        select: {
          clerkUserId: true,
        },
      },
    },
  });

  if (!account) throw new ApiError(404, "Staff account not found.");
  if (account.userId === actorUserId) {
    throw new ApiError(400, "You cannot edit your own account here.");
  }
  if (account.role === "SUPER_ADMIN") {
    throw new ApiError(403, "Super administrator accounts are protected.");
  }

  if (account.role === "TEACHER" && input.role !== "TEACHER") {
    throw new ApiError(
      400,
      "Teacher accounts must remain Teacher because they are linked to teacher records.",
    );
  }

  if (account.role !== "TEACHER" && input.role === "TEACHER") {
    throw new ApiError(
      400,
      "Create teacher accounts from the Teachers page so academic links remain intact.",
    );
  }

  const normalizedPhone = await assertPhoneAvailable(
    schoolId,
    input.phone,
    membershipId,
  );

  await provisionStaffLogin({
    schoolId,
    schoolSlug,
    displayName: input.fullName,
    phone: normalizedPhone,
    role: input.role,
    designation: input.designation,
    existingClerkUserId: account.user.clerkUserId,
    isActive: input.active,
  });

  if (account.role === "TEACHER") {
    await prisma.teacher.updateMany({
      where: {
        schoolId,
        clerkId: account.user.clerkUserId,
      },
      data: {
        fullName: input.fullName,
        phone: normalizedPhone,
        designation: input.designation,
      },
    });
  }

  return { id: account.id };
}

export async function setStaffAccountActive(
  schoolId: string,
  membershipId: string,
  actorUserId: string,
  actorRole: string,
  active: boolean,
) {
  const account = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      schoolId,
      role: { in: [...STAFF_ACCOUNT_ROLES] },
    },
    select: { id: true, userId: true, role: true },
  });

  if (!account) throw new ApiError(404, "Staff account not found.");
  if (account.userId === actorUserId) {
    throw new ApiError(400, "You cannot disable your own account.");
  }
  if (account.role === "SUPER_ADMIN") {
    throw new ApiError(
      403,
      "Super administrator access cannot be changed here.",
    );
  }
  if (actorRole !== "SUPER_ADMIN" && account.role === "SCHOOL_ADMIN") {
    throw new ApiError(
      403,
      "Only a super administrator can manage school administrators.",
    );
  }

  return prisma.membership.update({
    where: { id: account.id },
    data: { isActive: active },
  });
}

export async function setStaffPermissions(
  schoolId: string,
  membershipId: string,
  actorUserId: string,
  actorRole: string,
  value: unknown,
) {
  const input = z
    .object({
      customPermissionsEnabled: z.boolean(),
      permissions: z.array(z.string()).max(50),
    })
    .parse(value);

  const account = await prisma.membership.findFirst({
    where: { id: membershipId, schoolId, role: { in: [...STAFF_ACCOUNT_ROLES] } },
    select: { id: true, userId: true, role: true },
  });

  if (!account) throw new ApiError(404, "Staff account not found.");
  if (account.userId === actorUserId) {
    throw new ApiError(400, "You cannot change your own permissions.");
  }
  if (["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(account.role)) {
    throw new ApiError(403, "Administrator permissions are protected.");
  }
  if (!["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(actorRole)) {
    throw new ApiError(403, "Only an administrator can delegate permissions.");
  }

  const permissions = input.customPermissionsEnabled
    ? normalizeStaffPermissions(input.permissions)
    : [];

  return prisma.membership.update({
    where: { id: account.id },
    data: {
      customPermissionsEnabled: input.customPermissionsEnabled,
      permissions,
    },
    select: {
      id: true,
      customPermissionsEnabled: true,
      permissions: true,
    },
  });
}
