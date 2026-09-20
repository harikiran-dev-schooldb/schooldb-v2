import { randomUUID } from "node:crypto";
import { z } from "zod";

import { provisionStaffLogin } from "@/features/auth/account-provisioning";
import { normalizeIndianMobile } from "@/features/auth/otp";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const adminAccountInput = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => Boolean(normalizeIndianMobile(value)),
      "Enter a valid Indian mobile number.",
    ),
  role: z.enum(["SUPER_ADMIN", "SCHOOL_ADMIN"]),
  isActive: z.boolean(),
});

const adminRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN"] as const;
const staffRoles = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "TEACHER",
  "ACCOUNTANT",
  "RECEPTIONIST",
] as const;

export async function listAdminAccounts(schoolId: string) {
  const memberships = await prisma.membership.findMany({
    where: { schoolId, role: { in: [...adminRoles] } },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      userId: true,
      role: true,
      isActive: true,
      user: { select: { firstName: true, lastName: true, phone: true } },
    },
  });
  return memberships.map((membership) => ({
    id: membership.id,
    userId: membership.userId,
    fullName: [membership.user.firstName, membership.user.lastName]
      .filter(Boolean)
      .join(" "),
    phone: membership.user.phone ?? "",
    role: membership.role,
    isActive: membership.isActive,
  }));
}

async function assertPhoneAvailable(
  schoolId: string,
  phone: string,
  excludeMembershipId?: string,
) {
  const digits = normalizeIndianMobile(phone)!;
  const duplicate = await prisma.membership.findFirst({
    where: {
      schoolId,
      ...(excludeMembershipId ? { id: { not: excludeMembershipId } } : {}),
      role: { in: [...staffRoles] },
      user: { phone: { endsWith: digits } },
    },
    select: { id: true },
  });
  if (duplicate)
    throw new ApiError(
      409,
      "Another staff account already uses this mobile number in this school.",
    );
}

export async function createAdminAccount(
  schoolId: string,
  schoolSlug: string,
  value: unknown,
) {
  const input = adminAccountInput.parse(value);
  await assertPhoneAvailable(schoolId, input.phone);
  const user = await provisionStaffLogin({
    schoolId,
    schoolSlug,
    displayName: input.fullName,
    phone: input.phone,
    role: input.role,
    externalId: `schooldb:${schoolId}:admin:${randomUUID()}`,
    designation:
      input.role === "SUPER_ADMIN"
        ? "Super Administrator"
        : "School Administrator",
    isActive: input.isActive,
  });
  return prisma.membership.findUniqueOrThrow({
    where: { userId_schoolId: { userId: user.id, schoolId } },
    select: { id: true },
  });
}

export async function updateAdminAccount(
  schoolId: string,
  schoolSlug: string,
  actorUserId: string,
  membershipId: string,
  value: unknown,
) {
  const input = adminAccountInput.parse(value);
  const current = await prisma.membership.findFirst({
    where: { id: membershipId, schoolId, role: { in: [...adminRoles] } },
    select: { id: true, userId: true, user: { select: { clerkUserId: true } } },
  });
  if (!current) throw new ApiError(404, "Administrator account not found.");
  if (current.userId === actorUserId)
    throw new ApiError(
      400,
      "You cannot edit your own administrator access here.",
    );
  await assertPhoneAvailable(schoolId, input.phone, membershipId);
  await provisionStaffLogin({
    schoolId,
    schoolSlug,
    displayName: input.fullName,
    phone: input.phone,
    role: input.role,
    designation:
      input.role === "SUPER_ADMIN"
        ? "Super Administrator"
        : "School Administrator",
    existingClerkUserId: current.user.clerkUserId,
    isActive: input.isActive,
  });
  return { id: membershipId };
}
