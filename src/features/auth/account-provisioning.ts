import { createHash, randomBytes } from "node:crypto";

import { clerkClient } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

import { normalizeIndianMobile } from "./otp";

type ManagedRole = "STUDENT" | "PARENT" | "TEACHER";

export type LoginProvisionResult = {
  status: "PROVISIONED" | "SKIPPED" | "FAILED";
  accounts: ManagedRole[];
  message: string;
};

type ManagedAccountInput = {
  schoolId: string;
  schoolSlug: string;
  role: ManagedRole;
  externalId: string;
  displayName: string;
  phone: string;
  existingClerkUserId?: string | null;
};

function identityHash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 20);
}

function splitName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "SchoolDB",
    lastName: parts.slice(1).join(" ") || null,
  };
}

function internalEmail(externalId: string) {
  return `account_${identityHash(externalId)}@schooldb.invalid`;
}

async function ensureManagedAccount(input: ManagedAccountInput) {
  const client = await clerkClient();
  const name = splitName(input.displayName);
  let clerkUser;

  if (input.existingClerkUserId) {
    clerkUser = await client.users.getUser(input.existingClerkUserId);
  } else {
    const existing = await client.users.getUserList({
      externalId: [input.externalId],
      limit: 1,
    });
    clerkUser = existing.data[0];
  }

  if (!clerkUser) {
    clerkUser = await client.users.createUser({
      externalId: input.externalId,
      emailAddress: [internalEmail(input.externalId)],
      password: `${randomBytes(24).toString("base64url")}Aa1!`,
      firstName: name.firstName,
      lastName: name.lastName ?? undefined,
      publicMetadata: {
        managedBy: "SchoolDB",
        schoolSlug: input.schoolSlug,
        role: input.role,
      },
    });
  } else {
    await client.users.updateUser(clerkUser.id, {
      firstName: name.firstName,
      lastName: name.lastName ?? undefined,
      publicMetadata: {
        ...clerkUser.publicMetadata,
        managedBy: "SchoolDB",
        schoolSlug: input.schoolSlug,
        role: input.role,
      },
    });
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { clerkUserId: clerkUser.id },
      create: {
        clerkUserId: clerkUser.id,
        email: internalEmail(input.externalId),
        firstName: name.firstName,
        lastName: name.lastName,
        phone: input.phone,
      },
      update: {
        firstName: name.firstName,
        lastName: name.lastName,
        phone: input.phone,
      },
      select: { id: true, clerkUserId: true },
    });

    const existingMembership = await tx.membership.findUnique({
      where: { userId_schoolId: { userId: user.id, schoolId: input.schoolId } },
      select: { role: true },
    });
    if (existingMembership && existingMembership.role !== input.role) {
      throw new Error(`The linked account already has the ${existingMembership.role} role in this school.`);
    }

    await tx.membership.upsert({
      where: { userId_schoolId: { userId: user.id, schoolId: input.schoolId } },
      create: {
        userId: user.id,
        schoolId: input.schoolId,
        role: input.role,
        isActive: true,
      },
      update: { isActive: true },
    });

    return user;
  });
}

async function deactivateLinkedMembership(schoolId: string, clerkUserId: string | null) {
  if (!clerkUserId) return;
  await prisma.membership.updateMany({
    where: { schoolId, user: { clerkUserId } },
    data: { isActive: false },
  });
}

export async function provisionStudentLogin(studentId: string, schoolId: string): Promise<LoginProvisionResult> {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: {
      id: true,
      admissionNo: true,
      fullName: true,
      phone: true,
      clerkId: true,
      status: true,
      fatherName: true,
      fatherPhone: true,
      motherName: true,
      motherPhone: true,
      guardianName: true,
      guardianPhone: true,
      school: { select: { slug: true } },
    },
  });
  if (!student) throw new Error("Student not found while creating login access.");

  if (student.status !== "ACTIVE") {
    await Promise.all([
      deactivateLinkedMembership(schoolId, student.clerkId),
      prisma.parentStudentLink.updateMany({ where: { schoolId, studentId }, data: { active: false } }),
    ]);
    return { status: "SKIPPED", accounts: [], message: "Login access is disabled because the student is not active." };
  }

  const accounts: ManagedRole[] = [];
  const studentPhone = normalizeIndianMobile(student.phone || "");
  if (studentPhone) {
    const directAccount = await ensureManagedAccount({
      schoolId,
      schoolSlug: student.school.slug,
      role: "STUDENT",
      externalId: `schooldb:${schoolId}:student:${student.id}`,
      displayName: student.fullName || `Student ${student.admissionNo}`,
      phone: studentPhone,
      existingClerkUserId: student.clerkId,
    });
    await prisma.student.update({
      where: { id: student.id, schoolId },
      data: { clerkId: directAccount.clerkUserId, username: `STD_${student.admissionNo}` },
    });
    accounts.push("STUDENT");
  } else {
    await deactivateLinkedMembership(schoolId, student.clerkId);
    if (student.clerkId) {
      await prisma.student.update({ where: { id: student.id, schoolId }, data: { clerkId: null } });
    }
  }

  const parentCandidates = [
    { name: student.guardianName, phone: student.guardianPhone, relationship: "Guardian" },
    { name: student.fatherName, phone: student.fatherPhone, relationship: "Father" },
    { name: student.motherName, phone: student.motherPhone, relationship: "Mother" },
  ];
  const parent = parentCandidates
    .map((candidate) => ({ ...candidate, normalizedPhone: normalizeIndianMobile(candidate.phone || "") }))
    .find((candidate) => candidate.normalizedPhone);

  if (parent?.normalizedPhone) {
    const existingParent = await prisma.membership.findFirst({
      where: {
        schoolId,
        role: "PARENT",
        user: { phone: { endsWith: parent.normalizedPhone } },
      },
      select: { user: { select: { id: true } } },
    });

    const parentUser = existingParent?.user ?? await ensureManagedAccount({
      schoolId,
      schoolSlug: student.school.slug,
      role: "PARENT",
      externalId: `schooldb:${schoolId}:parent:${parent.normalizedPhone}`,
      displayName: parent.name || `Parent of ${student.fullName || student.admissionNo}`,
      phone: parent.normalizedPhone,
    });

    await prisma.$transaction([
      prisma.membership.updateMany({
        where: { schoolId, userId: parentUser.id, role: "PARENT" },
        data: { isActive: true },
      }),
      prisma.parentStudentLink.updateMany({
        where: { schoolId, studentId, parentUserId: { not: parentUser.id } },
        data: { active: false },
      }),
      prisma.parentStudentLink.upsert({
        where: {
          schoolId_parentUserId_studentId: {
            schoolId,
            parentUserId: parentUser.id,
            studentId,
          },
        },
        create: {
          schoolId,
          parentUserId: parentUser.id,
          studentId,
          relationship: parent.relationship,
          active: true,
        },
        update: { active: true },
      }),
    ]);
    accounts.push("PARENT");
  } else {
    await prisma.parentStudentLink.updateMany({
      where: { schoolId, studentId },
      data: { active: false },
    });
  }

  return accounts.length
    ? { status: "PROVISIONED", accounts, message: "WhatsApp login access is ready." }
    : { status: "SKIPPED", accounts, message: "Add a valid student or parent mobile number to enable login." };
}

export async function provisionTeacherLogin(teacherId: string, schoolId: string): Promise<LoginProvisionResult> {
  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, schoolId },
    select: {
      id: true,
      employeeId: true,
      fullName: true,
      phone: true,
      clerkId: true,
      active: true,
      school: { select: { slug: true } },
    },
  });
  if (!teacher) throw new Error("Teacher not found while creating login access.");

  const phone = normalizeIndianMobile(teacher.phone || "");
  if (!teacher.active || !phone) {
    await deactivateLinkedMembership(schoolId, teacher.clerkId);
    if (teacher.clerkId && !teacher.active) {
      await prisma.teacher.update({ where: { id: teacher.id, schoolId }, data: { clerkId: null } });
    }
    return {
      status: "SKIPPED",
      accounts: [],
      message: teacher.active ? "Add a valid teacher mobile number to enable login." : "Login access is disabled because the teacher is inactive.",
    };
  }

  const account = await ensureManagedAccount({
    schoolId,
    schoolSlug: teacher.school.slug,
    role: "TEACHER",
    externalId: `schooldb:${schoolId}:teacher:${teacher.id}`,
    displayName: teacher.fullName,
    phone,
    existingClerkUserId: teacher.clerkId,
  });
  await prisma.teacher.update({
    where: { id: teacher.id, schoolId },
    data: { clerkId: account.clerkUserId, username: `TCH_${teacher.employeeId}` },
  });

  return { status: "PROVISIONED", accounts: ["TEACHER"], message: "WhatsApp login access is ready." };
}

export async function safelyProvisionStudentLogin(studentId: string, schoolId: string) {
  try {
    return await provisionStudentLogin(studentId, schoolId);
  } catch (error) {
    console.error("STUDENT LOGIN PROVISIONING ERROR", { studentId, schoolId, error });
    return { status: "FAILED", accounts: [], message: "Student was saved, but login setup needs to be retried." } satisfies LoginProvisionResult;
  }
}

export async function safelyProvisionTeacherLogin(teacherId: string, schoolId: string) {
  try {
    return await provisionTeacherLogin(teacherId, schoolId);
  } catch (error) {
    console.error("TEACHER LOGIN PROVISIONING ERROR", { teacherId, schoolId, error });
    return { status: "FAILED", accounts: [], message: "Teacher was saved, but login setup needs to be retried." } satisfies LoginProvisionResult;
  }
}
