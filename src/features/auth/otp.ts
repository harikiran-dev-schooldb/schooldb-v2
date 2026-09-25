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
};

const STAFF_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "TEACHER",
  "ACCOUNTANT",
  "RECEPTIONIST",
] as const;

export type OtpAccount = {
  id: string;
  clerkUserId: string;
  role: string;
  name: string;
  detail: string;
};

type UserIdRow = { id: string };

export async function resolveOtpAccounts(schoolId: string, phone: string) {
  const staffUserIds = await prisma.$queryRaw<UserIdRow[]>(Prisma.sql`
    SELECT DISTINCT u.id
    FROM "User" u
    INNER JOIN "Membership" m ON m."userId" = u.id
    WHERE m."schoolId" = ${schoolId}
      AND m."isActive" = true
      AND m.role::text IN (${Prisma.join(STAFF_ROLES)})
      AND RIGHT(regexp_replace(COALESCE(u.phone, ''), '[^0-9]', '', 'g'), 10) = ${phone}
  `);

  const matches = await prisma.$queryRaw<StudentPhoneMatch[]>(Prisma.sql`
    SELECT
      s.id AS "studentId",
      s."clerkId" AS "clerkId"
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

  // Student login provisioning may intentionally use the student's own,
  // guardian's, father's, or mother's number. Every matched student account
  // must therefore remain selectable for the number that provisioned it.
  const studentClerkIds = [...new Set(matches.flatMap((match) => match.clerkId ? [match.clerkId] : []))];
  const studentUsers = studentClerkIds.length > 0
    ? (await prisma.user.findMany({
      where: {
        clerkUserId: { in: studentClerkIds },
        memberships: { some: { schoolId, isActive: true, role: "STUDENT" } },
      },
      select: { id: true, clerkUserId: true, phone: true },
    })).filter((user) => normalizeIndianMobile(user.phone || "") === phone)
    : [];

  const parentLinks = matches.length > 0 ? await prisma.parentStudentLink.findMany({
    where: {
      schoolId,
      studentId: { in: matches.map((match) => match.studentId) },
      active: true,
      parentUser: { memberships: { some: { schoolId, isActive: true, role: "PARENT" } } },
    },
    select: { parentUserId: true },
  }) : [];

  const candidateIds = [...new Set([
    ...staffUserIds.map((user) => user.id),
    ...studentUsers.map((user) => user.id),
    ...parentLinks.map((link) => link.parentUserId),
  ])];

  if (candidateIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: candidateIds } },
    select: {
      id: true,
      clerkUserId: true,
      firstName: true,
      lastName: true,
      memberships: {
        where: { schoolId, isActive: true },
        select: { role: true },
        take: 1,
      },
    },
  });

  const matchedStudentClerkIds = studentUsers.map((user) => user.clerkUserId);
  const studentProfiles = matchedStudentClerkIds.length > 0
    ? await prisma.student.findMany({
        where: { schoolId, status: "ACTIVE", clerkId: { in: matchedStudentClerkIds } },
        select: { clerkId: true, fullName: true, admissionNo: true },
      })
    : [];
  const studentsByClerkId = new Map(
    studentProfiles.filter((student) => student.clerkId).map((student) => [student.clerkId!, student]),
  );

  return users.flatMap<OtpAccount>((user) => {
    const membership = user.memberships[0];
    if (!membership) return [];
    const student = membership.role === "STUDENT" ? studentsByClerkId.get(user.clerkUserId) : undefined;
    const userName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    return [{
      id: user.id,
      clerkUserId: user.clerkUserId,
      role: membership.role,
      name: student?.fullName || userName || "SchoolDB user",
      detail: student ? `Admission ${student.admissionNo}` : membership.role.replaceAll("_", " ").toLowerCase(),
    }];
  });
}
