import { z } from "zod";

import { provisionStaffLogin } from "@/features/auth/account-provisioning";
import { normalizeIndianMobile } from "@/features/auth/otp";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const presetSchema = z.enum([
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VICE_PRINCIPAL",
  "ACCOUNTANT",
  "RECEPTIONIST",
]);

export const createStaffAccountSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .refine((value) => Boolean(normalizeIndianMobile(value)), "Enter a valid Indian mobile number."),
  preset: presetSchema,
});

const presetAccess = {
  SCHOOL_ADMIN: { role: "SCHOOL_ADMIN", designation: "School Administrator" },
  PRINCIPAL: { role: "SCHOOL_ADMIN", designation: "Principal" },
  VICE_PRINCIPAL: { role: "SCHOOL_ADMIN", designation: "Vice Principal" },
  ACCOUNTANT: { role: "ACCOUNTANT", designation: "Accountant" },
  RECEPTIONIST: { role: "RECEPTIONIST", designation: "Receptionist" },
} as const;

export async function createStaffAccount(
  schoolId: string,
  schoolSlug: string,
  actorRole: string,
  value: unknown,
) {
  const input = createStaffAccountSchema.parse(value);
  const access = presetAccess[input.preset];
  if (actorRole !== "SUPER_ADMIN" && access.role === "SCHOOL_ADMIN") {
    throw new ApiError(403, "Only a super administrator can create school administrators or principals.");
  }

  const digits = normalizeIndianMobile(input.phone)!;
  const duplicate = await prisma.membership.findFirst({
    where: {
      schoolId,
      role: { in: ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT", "RECEPTIONIST"] },
      user: { phone: { endsWith: digits } },
    },
    select: { id: true },
  });
  if (duplicate) throw new ApiError(409, "A staff account already uses this mobile number in this school.");

  return provisionStaffLogin({
    schoolId,
    schoolSlug,
    displayName: input.fullName,
    phone: input.phone,
    role: access.role,
    designation: access.designation,
  });
}

export async function setStaffAccountActive(
  schoolId: string,
  membershipId: string,
  actorUserId: string,
  actorRole: string,
  active: boolean,
) {
  const account = await prisma.membership.findFirst({
    where: { id: membershipId, schoolId },
    select: { id: true, userId: true, role: true },
  });
  if (!account) throw new ApiError(404, "Staff account not found.");
  if (account.userId === actorUserId) throw new ApiError(400, "You cannot disable your own account.");
  if (account.role === "SUPER_ADMIN") throw new ApiError(403, "Super administrator access cannot be changed here.");
  if (actorRole !== "SUPER_ADMIN" && account.role === "SCHOOL_ADMIN") {
    throw new ApiError(403, "Only a super administrator can manage school administrators.");
  }

  return prisma.membership.update({
    where: { id: account.id },
    data: { isActive: active },
  });
}
