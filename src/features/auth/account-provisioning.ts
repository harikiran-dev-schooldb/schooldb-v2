import { createHash, randomBytes } from "node:crypto";

import { clerkClient } from "@clerk/nextjs/server";

import type { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { clerkErrorDetails, clerkErrorMessage } from "./clerk-error";
import { normalizeIndianMobile } from "./otp";

type ManagedRole = "STUDENT" | "TEACHER";

export type LoginProvisionResult = {
  status: "PROVISIONED" | "SKIPPED" | "FAILED";
  accounts: ManagedRole[];
  message: string;
};

type ManagedAccountInput = {
  schoolId: string;
  schoolSlug: string;
  role: Role;
  externalId: string;
  displayName: string;
  phone: string;
  existingClerkUserId?: string | null;
  designation?: string | null;
  allowRoleUpdate?: boolean;
  isActive?: boolean;
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
  return `account_${identityHash(externalId)}@schooldb.example.com`;
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
      emailAddressIdentificationStatus: ["reserved"],
      password: `${randomBytes(24).toString("base64url")}Aa1!`,
      skipLegalChecks: true,
      firstName: name.firstName,
      lastName: name.lastName ?? undefined,
      publicMetadata: {
        managedBy: "SchoolDB",
        schoolSlug: input.schoolSlug,
        role: input.role,
        designation: input.designation ?? undefined,
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
        designation: input.designation ?? undefined,
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
    if (
      existingMembership &&
      existingMembership.role !== input.role &&
      !input.allowRoleUpdate
    ) {
      throw new Error(
        `The linked account already has the ${existingMembership.role} role in this school.`,
      );
    }

    await tx.membership.upsert({
      where: { userId_schoolId: { userId: user.id, schoolId: input.schoolId } },
      create: {
        userId: user.id,
        schoolId: input.schoolId,
        role: input.role,
        isActive: input.isActive ?? true,
        designation: input.designation,
      },
      update: {
        isActive: input.isActive ?? true,
        ...(input.allowRoleUpdate ? { role: input.role } : {}),
        ...(input.designation !== undefined
          ? { designation: input.designation }
          : {}),
      },
    });

    return user;
  });
}

export async function provisionStaffLogin(input: {
  schoolId: string;
  schoolSlug: string;
  displayName: string;
  phone: string;
  role: "SUPER_ADMIN" | "SCHOOL_ADMIN" | "ACCOUNTANT" | "RECEPTIONIST";
  designation: string;
  existingClerkUserId?: string;
  isActive?: boolean;
  externalId?: string;
}) {
  const phone = normalizeIndianMobile(input.phone);
  if (!phone) throw new Error("Enter a valid Indian mobile number.");

  try {
    return await ensureManagedAccount({
      ...input,
      phone,
      externalId: input.externalId ?? `schooldb:${input.schoolId}:staff:${phone}`,
      allowRoleUpdate: true,
    });
  } catch (error) {
    const message = clerkErrorMessage(error);
    if (message) throw new Error(message);
    throw error;
  }
}

async function deactivateLinkedMembership(
  schoolId: string,
  clerkUserId: string | null,
) {
  if (!clerkUserId) return;
  await prisma.membership.updateMany({
    where: { schoolId, user: { clerkUserId } },
    data: { isActive: false },
  });
}

export async function provisionStudentLogin(
  studentId: string,
  schoolId: string,
): Promise<LoginProvisionResult> {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: {
      id: true,
      admissionNo: true,
      fullName: true,
      phone: true,
      clerkId: true,
      status: true,

      fatherPhone: true,
      motherPhone: true,
      guardianPhone: true,

      school: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!student) {
    throw new Error("Student not found while creating login access.");
  }

  if (student.status !== "ACTIVE") {
    await deactivateLinkedMembership(schoolId, student.clerkId);

    if (student.clerkId) {
      await prisma.student.update({
        where: {
          id: student.id,
          schoolId,
        },
        data: {
          clerkId: null,
        },
      });
    }

    return {
      status: "SKIPPED",
      accounts: [],
      message: "Login access is disabled because the student is not active.",
    };
  }

  /*
   * One Clerk account per student.
   *
   * Phone priority:
   * 1. Student
   * 2. Guardian
   * 3. Father
   * 4. Mother
   *
   * Regardless of whose phone number is used,
   * this is still a STUDENT account.
   */
  const loginPhone =
    normalizeIndianMobile(student.phone || "") ||
    normalizeIndianMobile(student.guardianPhone || "") ||
    normalizeIndianMobile(student.fatherPhone || "") ||
    normalizeIndianMobile(student.motherPhone || "");

  if (!loginPhone) {
    await deactivateLinkedMembership(schoolId, student.clerkId);

    if (student.clerkId) {
      await prisma.student.update({
        where: {
          id: student.id,
          schoolId,
        },
        data: {
          clerkId: null,
        },
      });
    }

    return {
      status: "SKIPPED",
      accounts: [],
      message:
        "Add a valid student, guardian, father, or mother mobile number to enable login.",
    };
  }

  /*
   * Unique Clerk user per student.
   *
   * The externalId uses student.id,
   * not the phone number.
   *
   * So even siblings sharing the same parent phone
   * still receive separate Clerk users.
   */
  const account = await ensureManagedAccount({
    schoolId,
    schoolSlug: student.school.slug,
    role: "STUDENT",
    externalId: `schooldb:${schoolId}:student:${student.id}`,
    displayName: student.fullName || `Student ${student.admissionNo}`,
    phone: loginPhone,
    existingClerkUserId: student.clerkId,
  });

  await prisma.student.update({
    where: {
      id: student.id,
      schoolId,
    },
    data: {
      clerkId: account.clerkUserId,
      username: `STD_${student.admissionNo}`,
    },
  });

  /*
   * Parent accounts are no longer part of the login model.
   * Any old links are disabled.
   */
  await prisma.parentStudentLink.updateMany({
    where: {
      schoolId,
      studentId: student.id,
    },
    data: {
      active: false,
    },
  });

  return {
    status: "PROVISIONED",
    accounts: ["STUDENT"],
    message: "Student login access is ready.",
  };
}

export async function provisionTeacherLogin(
  teacherId: string,
  schoolId: string,
): Promise<LoginProvisionResult> {
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
  if (!teacher)
    throw new Error("Teacher not found while creating login access.");

  const phone = normalizeIndianMobile(teacher.phone || "");
  if (!teacher.active || !phone) {
    await deactivateLinkedMembership(schoolId, teacher.clerkId);
    if (teacher.clerkId && !teacher.active) {
      await prisma.teacher.update({
        where: { id: teacher.id, schoolId },
        data: { clerkId: null },
      });
    }
    return {
      status: "SKIPPED",
      accounts: [],
      message: teacher.active
        ? "Add a valid teacher mobile number to enable login."
        : "Login access is disabled because the teacher is inactive.",
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
    data: {
      clerkId: account.clerkUserId,
      username: `TCH_${teacher.employeeId}`,
    },
  });

  return {
    status: "PROVISIONED",
    accounts: ["TEACHER"],
    message: "WhatsApp login access is ready.",
  };
}

export async function safelyProvisionStudentLogin(
  studentId: string,
  schoolId: string,
) {
  try {
    return await provisionStudentLogin(studentId, schoolId);
  } catch (error) {
    console.error("STUDENT LOGIN PROVISIONING ERROR", {
      studentId,
      schoolId,
      ...clerkErrorDetails(error),
    });
    return {
      status: "FAILED",
      accounts: [],
      message: "Student was saved, but login setup needs to be retried.",
    } satisfies LoginProvisionResult;
  }
}

export async function safelyProvisionTeacherLogin(
  teacherId: string,
  schoolId: string,
) {
  try {
    return await provisionTeacherLogin(teacherId, schoolId);
  } catch (error) {
    console.error("TEACHER LOGIN PROVISIONING ERROR", {
      teacherId,
      schoolId,
      ...clerkErrorDetails(error),
    });
    return {
      status: "FAILED",
      accounts: [],
      message: "Teacher was saved, but login setup needs to be retried.",
    } satisfies LoginProvisionResult;
  }
}
