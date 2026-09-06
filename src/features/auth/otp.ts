import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const OTP_EXPIRY_MS = 5 * 60 * 1000;
export const OTP_RESEND_MS = 30 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export function normalizeIndianMobile(value: string) {
  const digits = value.replace(/\D/g, "");
  const national = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(national) ? national : null;
}

export function phoneHash(schoolId: string, phone: string) {
  return createHash("sha256").update(`${schoolId}:${phone}`).digest("hex");
}

export function otpHash(schoolId: string, phone: string, code: string) {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) throw new Error("Authentication is not configured");
  return createHmac("sha256", secret).update(`${schoolId}:${phone}:${code}`).digest("hex");
}

export function otpMatches(expectedHash: string, actualHash: string) {
  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(actualHash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function generateOtp() {
  return randomInt(100000, 1_000_000).toString();
}

type StudentPhoneMatch = {
  studentId: string;
  clerkId: string | null;
  ownMatch: boolean;
};

export async function resolveOtpUser(
  schoolId: string,
  phone: string,
  accountType: "FAMILY" | "STAFF",
) {
  if (accountType === "STAFF") {
    const staffUsers = await prisma.user.findMany({
      where: {
        phone,
        memberships: {
          some: {
            schoolId,
            isActive: true,
            role: {
              in: [
                "SUPER_ADMIN",
                "SCHOOL_ADMIN",
                "TEACHER",
                "ACCOUNTANT",
                "RECEPTIONIST",
              ],
            },
          },
        },
      },
      select: { id: true, clerkUserId: true },
      take: 2,
    });
    return staffUsers.length === 1 ? staffUsers[0] : null;
  }

  const matches = await prisma.$queryRaw<StudentPhoneMatch[]>(Prisma.sql`
    SELECT
      s.id AS "studentId",
      s."clerkId" AS "clerkId",
      RIGHT(regexp_replace(COALESCE(s.phone, ''), '[^0-9]', '', 'g'), 10) = ${phone} AS "ownMatch"
    FROM "Student" s
    WHERE s."schoolId" = ${schoolId}
      AND s.status = 'ACTIVE'
      AND (
        RIGHT(regexp_replace(COALESCE(s.phone, ''), '[^0-9]', '', 'g'), 10) = ${phone}
        OR RIGHT(regexp_replace(COALESCE(s."fatherPhone", ''), '[^0-9]', '', 'g'), 10) = ${phone}
        OR RIGHT(regexp_replace(COALESCE(s."motherPhone", ''), '[^0-9]', '', 'g'), 10) = ${phone}
        OR RIGHT(regexp_replace(COALESCE(s."guardianPhone", ''), '[^0-9]', '', 'g'), 10) = ${phone}
      )
  `);

  if (matches.length === 0) return null;

  const directClerkIds = [...new Set(matches.filter((match) => match.ownMatch && match.clerkId).map((match) => match.clerkId!))];
  if (directClerkIds.length > 0) {
    const directUsers = await prisma.user.findMany({
      where: {
        clerkUserId: { in: directClerkIds },
        memberships: { some: { schoolId, isActive: true, role: { in: ["STUDENT", "PARENT"] } } },
      },
      select: { id: true, clerkUserId: true },
      take: 2,
    });
    if (directUsers.length === 1) return directUsers[0];
  }

  const parentLinks = await prisma.parentStudentLink.findMany({
    where: {
      schoolId,
      studentId: { in: matches.map((match) => match.studentId) },
      active: true,
      parentUser: { memberships: { some: { schoolId, isActive: true, role: "PARENT" } } },
    },
    select: { parentUser: { select: { id: true, clerkUserId: true } } },
  });
  const uniqueParents = new Map(parentLinks.map((link) => [link.parentUser.id, link.parentUser]));
  return uniqueParents.size === 1 ? [...uniqueParents.values()][0] : null;
}
