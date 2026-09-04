import { currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";

import { ApiError } from "./errors";
import { prisma } from "./prisma";

export async function requireTenant(schoolSlug?: string) {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw new ApiError(401, "Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: {
      clerkUserId: clerkUser.id,
    },
  });

  if (!user) {
    throw new ApiError(403, "User is not provisioned for SchoolDB");
  }

  const requestHeaders = await headers();
  const requestedSchoolSlug =
    schoolSlug ?? requestHeaders.get("x-school-slug") ?? undefined;

  const memberships = await prisma.membership.findMany({
    where: {
      userId: user.id,
      isActive: true,
      ...(requestedSchoolSlug
        ? {
            school: {
              slug: requestedSchoolSlug,
            },
          }
        : {}),
    },
    include: {
      school: true,
    },
  });

  if (memberships.length === 0) {
    throw new ApiError(403, "No active membership for this school");
  }

  if (!requestedSchoolSlug && memberships.length > 1) {
    throw new ApiError(
      400,
      "School context is required for users with multiple schools",
    );
  }

  return memberships[0];
}

export async function requireRole(allowedRoles: string[], schoolSlug?: string) {
  const membership = await requireTenant(schoolSlug);

  if (!allowedRoles.includes(membership.role)) {
    throw new ApiError(
      403,
      "You do not have permission to perform this action",
    );
  }

  return membership;
}

async function requireCurrentTeacher(schoolId: string) {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw new ApiError(401, "Unauthorized");
  }

  const teacher = await prisma.teacher.findFirst({
    where: {
      schoolId,
      clerkId: clerkUser.id,
      active: true,
    },
  });

  if (!teacher) {
    throw new ApiError(
      403,
      "You are not linked to an active teacher account for this school",
    );
  }

  return teacher;
}

export async function requireTeacherAllocation(
  allocationId: string,
  schoolSlug?: string,
) {
  const membership = await requireTenant(schoolSlug);

  if (membership.role !== "TEACHER") {
    if (!["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(membership.role)) {
      throw new ApiError(
        403,
        "You do not have permission to perform this action",
      );
    }
    return membership;
  }

  const teacher = await requireCurrentTeacher(membership.schoolId);
  const allocation = await prisma.teacherAllocation.findFirst({
    where: {
      id: allocationId,
      schoolId: membership.schoolId,
      teacherId: teacher.id,
      active: true,
    },
  });

  if (!allocation) {
    throw new ApiError(403, "This teaching allocation is not assigned to you");
  }

  return membership;
}

export async function requireTeacherTimetable(
  timetableId: string,
  schoolSlug?: string,
) {
  const membership = await requireTenant(schoolSlug);

  if (membership.role !== "TEACHER") {
    if (!["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(membership.role)) {
      throw new ApiError(
        403,
        "You do not have permission to perform this action",
      );
    }
    return membership;
  }

  const teacher = await requireCurrentTeacher(membership.schoolId);
  const timetable = await prisma.timetable.findFirst({
    where: {
      id: timetableId,
      schoolId: membership.schoolId,
      active: true,
      teacherAllocation: {
        teacherId: teacher.id,
        active: true,
      },
    },
  });

  if (!timetable) {
    throw new ApiError(403, "This timetable is not assigned to you");
  }

  return membership;
}

export async function requireTeacherAttendanceSession(
  sessionId: string,
  schoolSlug?: string,
) {
  const membership = await requireTenant(schoolSlug);

  if (membership.role !== "TEACHER") {
    if (!["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(membership.role)) {
      throw new ApiError(
        403,
        "You do not have permission to perform this action",
      );
    }
    return membership;
  }

  const teacher = await requireCurrentTeacher(membership.schoolId);
  const session = await prisma.attendanceSession.findFirst({
    where: {
      id: sessionId,
      schoolId: membership.schoolId,
      teacherId: teacher.id,
    },
  });

  if (!session) {
    throw new ApiError(403, "This attendance session is not assigned to you");
  }

  return membership;
}

export async function requireTeacherClassSection(
  classId: string,
  sectionId?: string,
  schoolSlug?: string,
) {
  const membership = await requireTenant(schoolSlug);

  if (membership.role !== "TEACHER") {
    if (!["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(membership.role)) {
      throw new ApiError(
        403,
        "You do not have permission to perform this action",
      );
    }
    return membership;
  }

  const teacher = await requireCurrentTeacher(membership.schoolId);
  const allocation = await prisma.teacherAllocation.findFirst({
    where: {
      schoolId: membership.schoolId,
      teacherId: teacher.id,
      classId,
      ...(sectionId ? { sectionId } : {}),
      active: true,
    },
  });

  if (!allocation) {
    throw new ApiError(403, "This class or section is not assigned to you");
  }

  return membership;
}

export async function requireTeacherExamSchedule(
  scheduleId: string,
  sectionId: string,
  schoolSlug?: string,
) {
  const membership = await requireTenant(schoolSlug);

  if (membership.role !== "TEACHER") {
    if (!["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(membership.role)) {
      throw new ApiError(
        403,
        "You do not have permission to perform this action",
      );
    }
    return membership;
  }

  const teacher = await requireCurrentTeacher(membership.schoolId);
  const schedule = await prisma.examSchedule.findFirst({
    where: {
      id: scheduleId,
      schoolId: membership.schoolId,
    },
    select: {
      classId: true,
      sectionId: true,
      subjectId: true,
      exam: {
        select: {
          academicYearId: true,
        },
      },
    },
  });

  if (!schedule) {
    throw new ApiError(404, "Exam schedule not found");
  }

  if (schedule.sectionId && schedule.sectionId !== sectionId) {
    throw new ApiError(403, "This exam schedule is not assigned to you");
  }

  const allocation = await prisma.teacherAllocation.findFirst({
    where: {
      schoolId: membership.schoolId,
      teacherId: teacher.id,
      academicYearId: schedule.exam.academicYearId,
      classId: schedule.classId,
      subjectId: schedule.subjectId,
      sectionId,
      active: true,
    },
  });

  if (!allocation) {
    throw new ApiError(403, "This exam subject is not assigned to you");
  }

  return membership;
}
