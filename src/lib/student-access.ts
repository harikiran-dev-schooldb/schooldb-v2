import { cache } from "react";

import { ApiError } from "./errors";
import { prisma } from "./prisma";
import { requireMembership } from "./auth";
import { isSelfServiceRole, isStudentIdAccessible } from "./access-control";

function studentSelect(schoolId: string) {
  return {
  id: true,
  admissionNo: true,
  fullName: true,
  imageUrl: true,
  enrollments: {
    where: { active: true, schoolId },
    orderBy: { updatedAt: "desc" as const },
    take: 1,
    select: {
      id: true,
      rollNo: true,
      academicYearId: true,
      classId: true,
      sectionId: true,
      academicYear: { select: { id: true, name: true, attendanceMode: true } },
      class: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
    },
  },
  } as const;
}

export const listAccessibleStudents = cache(async (schoolSlug: string) => {
  const membership = await requireMembership(schoolSlug);

  if (!isSelfServiceRole(membership.role)) {
    throw new ApiError(403, "This account does not have self-service access");
  }

  if (membership.role === "STUDENT") {
    const students = await prisma.student.findMany({
      where: {
        schoolId: membership.schoolId,
        clerkId: membership.user.clerkUserId,
        status: "ACTIVE",
      },
      select: studentSelect(membership.schoolId),
    });

    if (students.length !== 1) {
      throw new ApiError(
        403,
        "This login must be linked to exactly one active student",
      );
    }

    return {
      membership,
      students: [{ ...students[0], relationship: "Self" }],
    };
  }

  const links = await prisma.parentStudentLink.findMany({
    where: {
      schoolId: membership.schoolId,
      parentUserId: membership.userId,
      active: true,
      student: {
        schoolId: membership.schoolId,
        status: "ACTIVE",
      },
    },
    orderBy: { createdAt: "asc" },
    select: {
      relationship: true,
      student: { select: studentSelect(membership.schoolId) },
    },
  });

  if (links.length === 0) {
    throw new ApiError(403, "No active students are linked to this account");
  }

  return {
    membership,
    students: links.map((link) => ({
      ...link.student,
      relationship: link.relationship,
    })),
  };
});

export const requireStudentAccess = cache(
  async (schoolSlug: string, studentId: string) => {
    const context = await listAccessibleStudents(schoolSlug);
    if (!isStudentIdAccessible(context.students, studentId)) {
      throw new ApiError(403, "You do not have access to this student");
    }

    const student = context.students.find((item) => item.id === studentId)!;

    return {
      membership: context.membership,
      student,
      enrollment: student.enrollments[0] ?? null,
    };
  },
);
