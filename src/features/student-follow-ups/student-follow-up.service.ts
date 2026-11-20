import type { Prisma } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit";
import { requireCurrentTeacher, requireTenant } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { isRouteAllowed } from "@/lib/route-access";
import { withTransactionRetry } from "@/lib/transaction-retry";
import { z } from "zod";

import {
  FOLLOW_UP_SOURCES,
  followUpDate,
  schoolWeek,
  type FollowUpSource,
  type createFollowUpSchema,
  type followUpContextSchema,
  type listFollowUpsSchema,
  type updateFollowUpSchema,
} from "./student-follow-up";

type FollowUpDb = Pick<Prisma.TransactionClient,
  "exam" | "examSchedule" | "studentFollowUp" | "studentEnrollment" |
  "teacher" | "teacherAllocation" | "classTeacherAssignment"
>;

const followUpSelect = {
  id: true,
  source: true,
  status: true,
  nextAction: true,
  dueDate: true,
  parentContactedAt: true,
  closureNotes: true,
  outcome: true,
  escalationLevel: true,
  enrollment: {
    select: {
      academicYearId: true,
      student: { select: { id: true, fullName: true, admissionNo: true } },
      class: { select: { name: true } },
      section: { select: { name: true } },
    },
  },
  teacher: { select: { id: true, fullName: true } },
  exam: { select: { id: true, name: true } },
} satisfies Prisma.StudentFollowUpSelect;

type FollowUpRow = Prisma.StudentFollowUpGetPayload<{ select: typeof followUpSelect }>;

function formatFollowUp({ enrollment, dueDate, parentContactedAt, ...followUp }: FollowUpRow) {
  return {
    ...followUp,
    student: enrollment.student,
    academicYearId: enrollment.academicYearId,
    className: enrollment.class.name,
    sectionName: enrollment.section.name,
    dueDate: dueDate.toISOString().slice(0, 10),
    parentContactedAt: parentContactedAt?.toISOString() ?? null,
  };
}

export async function requireStudentFollowUpAccess() {
  const tenant = await requireTenant();
  if (!isRouteAllowed(tenant.school, "student-follow-ups")) {
    throw new ApiError(403, "Student Follow-Ups is disabled for this school.");
  }

  if (tenant.role === "SCHOOL_ADMIN" || tenant.role === "SUPER_ADMIN") {
    return { tenant, teacherId: null, sources: [...FOLLOW_UP_SOURCES] };
  }

  if (tenant.role !== "TEACHER") throw new ApiError(403, "Student Follow-Ups is available to school admins and teachers.");

  const teacher = await requireCurrentTeacher(tenant.schoolId);
  const sources: FollowUpSource[] = [];
  if (teacher.resultAccess) sources.push("EXAM_FAILURE");
  if (teacher.attendanceAccess) sources.push("LOW_ATTENDANCE");
  if (sources.length === 0) throw new ApiError(403, "Results or attendance access is required.");

  return { tenant, teacherId: teacher.id, sources };
}

type FollowUpAccess = Awaited<ReturnType<typeof requireStudentFollowUpAccess>>;

async function teacherPlacements(db: FollowUpDb, schoolId: string, teacherId: string) {
  const assignment = {
    where: { schoolId, teacherId, active: true },
    select: { academicYearId: true, classId: true, sectionId: true },
  } as const;
  const teaching = await db.teacherAllocation.findMany(assignment);
  const classes = await db.classTeacherAssignment.findMany(assignment);
  return [...new Map([...teaching, ...classes].map((entry) => [
    `${entry.academicYearId}:${entry.classId}:${entry.sectionId}`, entry,
  ])).values()];
}

async function visibleFollowUps(db: FollowUpDb, access: FollowUpAccess): Promise<Prisma.StudentFollowUpWhereInput> {
  const { teacherId, tenant, sources } = access;
  const { schoolId } = tenant;
  return {
    schoolId,
    teacher: { schoolId },
    ...(teacherId ? { teacherId, source: { in: sources } } : {}),
    enrollment: {
      schoolId,
      student: { schoolId },
      ...(teacherId ? { OR: await teacherPlacements(db, schoolId, teacherId) } : {}),
    },
  };
}

type ContextInput = z.infer<typeof followUpContextSchema>;
type Placement = { academicYearId: string; classId: string; sectionId: string };

function applicableSchedule(schoolId: string, examId: string, placement: Placement) {
  return {
    schoolId,
    examId,
    classId: placement.classId,
    OR: [{ sectionId: null }, { sectionId: placement.sectionId }],
  };
}

function eligibleTeacherWhere(
  schoolId: string,
  source: FollowUpSource,
  placement: Placement,
  examId?: string | null,
): Prisma.TeacherWhereInput {
  const assignment = { schoolId, active: true, ...placement };
  return {
    schoolId,
    active: true,
    ...(source === "EXAM_FAILURE" ? { resultAccess: true } : { attendanceAccess: true }),
    OR: [
      { allocations: { some: {
        ...assignment,
        ...(examId ? { subject: { examSchedules: { some: applicableSchedule(schoolId, examId, placement) } } } : {}),
      } } },
      { classTeacherAssignments: { some: assignment } },
    ],
  };
}

async function followUpContext(db: FollowUpDb, access: FollowUpAccess, input: ContextInput) {
  const { tenant, teacherId, sources } = access;
  const { schoolId } = tenant;
  if (!sources.includes(input.source)) throw new ApiError(403, "You do not have access to this follow-up source.");
  if (input.source === "EXAM_FAILURE" && !input.examId) throw new ApiError(400, "Select an exam for this follow-up.");
  if (input.source === "LOW_ATTENDANCE" && input.examId) throw new ApiError(400, "Only exam follow-ups can reference an exam.");

  const exam = input.examId ? await db.exam.findFirst({
    where: { schoolId, id: input.examId, status: { not: "CANCELLED" } },
    select: { id: true, name: true, academicYearId: true },
  }) : null;
  if (input.examId && !exam) throw new ApiError(404, "Exam not found.");
  if (exam && input.academicYearId && exam.academicYearId !== input.academicYearId) {
    throw new ApiError(400, "Select the academic year of the exam.");
  }

  const academicYearId = exam?.academicYearId ?? input.academicYearId;
  const enrollment = await db.studentEnrollment.findFirst({
    where: {
      schoolId,
      studentId: input.studentId,
      active: true,
      student: { schoolId, status: "ACTIVE" },
      academicYear: {
        schoolId,
        ...(academicYearId ? { id: academicYearId } : { active: true }),
      },
      ...(teacherId ? { OR: await teacherPlacements(db, schoolId, teacherId) } : {}),
    },
    select: {
      id: true,
      academicYearId: true,
      classId: true,
      sectionId: true,
      student: { select: { id: true, fullName: true, admissionNo: true } },
    },
    orderBy: { academicYear: { startDate: "desc" } },
  });
  if (!enrollment) throw new ApiError(404, "No accessible student enrollment was found for this academic year.");

  const placement = enrollmentPlacement(enrollment);
  if (exam) {
    const schedule = await db.examSchedule.findFirst({
      where: applicableSchedule(schoolId, exam.id, placement),
      select: { id: true },
    });
    if (!schedule) throw new ApiError(404, "This exam has no schedules for the student's section.");

    if (teacherId && !await db.teacher.findFirst({
      where: { ...eligibleTeacherWhere(schoolId, input.source, placement, exam.id), id: teacherId },
      select: { id: true },
    })) {
      throw new ApiError(404, "This exam has no schedules assigned to you for the student's section.");
    }
  }

  return { enrollment, exam, placement };
}

function enrollmentPlacement(enrollment: Placement): Placement {
  return {
    academicYearId: enrollment.academicYearId,
    classId: enrollment.classId,
    sectionId: enrollment.sectionId,
  };
}

export async function listFollowUps(access: FollowUpAccess, input: z.infer<typeof listFollowUpsSchema>) {
  const size = 25;
  const where: Prisma.StudentFollowUpWhereInput = {
    ...await visibleFollowUps(prisma, access),
    ...(input.scope === "week"
      ? { dueDate: schoolWeek(), status: { not: "COMPLETED" } }
      : { status: input.status }),
  };
  const [rows, total] = await Promise.all([
    prisma.studentFollowUp.findMany({
      where,
      select: followUpSelect,
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
      skip: (input.page - 1) * size,
      take: size,
    }),
    prisma.studentFollowUp.count({ where }),
  ]);
  return {
    followUps: rows.map(formatFollowUp),
    total,
    page: input.page,
    hasMore: input.page * size < total,
    isTeacher: access.teacherId !== null,
    sources: access.sources,
  };
}

export async function getFollowUpOptions(access: FollowUpAccess, input: ContextInput) {
  const { enrollment, exam, placement } = await followUpContext(prisma, access, input);
  const teachers = await prisma.teacher.findMany({
    where: {
      ...eligibleTeacherWhere(access.tenant.schoolId, input.source, placement, exam?.id),
      ...(access.teacherId ? { id: access.teacherId } : {}),
    },
    select: { id: true, fullName: true },
    orderBy: [{ fullName: "asc" }, { id: "asc" }],
  });
  return { student: enrollment.student, teachers, exam };
}

async function checkForOpenFollowUp(
  db: FollowUpDb,
  where: { schoolId: string; enrollmentId: string; source: FollowUpSource; examId: string | null },
) {
  const existing = await db.studentFollowUp.findFirst({
    where: { ...where, status: { not: "COMPLETED" } },
    select: { id: true },
  });
  if (existing) throw new ApiError(409, "An open follow-up already exists for this student and source.");
}

export async function createFollowUp(access: FollowUpAccess, input: z.infer<typeof createFollowUpSchema>) {
  const { schoolId } = access.tenant;
  if (access.teacherId && access.teacherId !== input.teacherId) throw new ApiError(403, "Teachers can only assign a follow-up to themselves.");

  const created = await withTransactionRetry(() => prisma.$transaction(async (tx) => {
    const { enrollment, exam, placement } = await followUpContext(tx, access, input);
    const teacher = await tx.teacher.findFirst({
      where: {
        ...eligibleTeacherWhere(schoolId, input.source, placement, exam?.id),
        id: input.teacherId,
      },
      select: { id: true },
    });
    if (!teacher) throw new ApiError(400, "Choose an active teacher assigned to this class and section with the relevant access.");

    const context = { schoolId, enrollmentId: enrollment.id, source: input.source, examId: exam?.id ?? null };
    await checkForOpenFollowUp(tx, context);
    return tx.studentFollowUp.create({
      data: { ...context, teacherId: teacher.id, nextAction: input.nextAction, dueDate: followUpDate(input.dueDate) },
      select: followUpSelect,
    });
  }, { isolationLevel: "Serializable" }));

  await recordAuditLog({
    actor: access.tenant,
    module: "ACADEMICS",
    action: "CREATE",
    entityType: "STUDENT_FOLLOW_UP",
    entityId: created.id,
    summary: "Created a student follow-up.",
    metadata: { source: created.source, teacherId: created.teacher.id },
  });
  return formatFollowUp(created);
}

export async function updateFollowUp(access: FollowUpAccess, id: string, input: z.infer<typeof updateFollowUpSchema>) {
  if (access.teacherId && input.teacherId) throw new ApiError(403, "Only a school admin can reassign a follow-up.");
  const { schoolId } = access.tenant;

  const updated = await withTransactionRetry(() => prisma.$transaction(async (tx) => {
    const current = await tx.studentFollowUp.findFirst({
      where: { ...await visibleFollowUps(tx, access), id },
      select: {
        enrollmentId: true,
        examId: true,
        source: true,
        status: true,
        enrollment: { select: { academicYearId: true, classId: true, sectionId: true } },
      },
    });
    if (!current) throw new ApiError(404, "Follow-up not found.");

    if (current.status === "COMPLETED" && input.status && input.status !== "COMPLETED") {
      await checkForOpenFollowUp(tx, {
        schoolId, enrollmentId: current.enrollmentId, source: current.source, examId: current.examId,
      });
    }
    if (input.teacherId) {
      const teacher = await tx.teacher.findFirst({
        where: { ...eligibleTeacherWhere(schoolId, current.source, current.enrollment, current.examId), id: input.teacherId },
        select: { id: true },
      });
      if (!teacher) throw new ApiError(400, "Choose an active teacher assigned to this class and section with the relevant access.");
    }

    return tx.studentFollowUp.update({
      where: { id, schoolId },
      data: {
        status: input.status,
        nextAction: input.nextAction,
        teacherId: input.teacherId,
        dueDate: input.dueDate ? followUpDate(input.dueDate) : undefined,
        parentContactedAt: input.parentContacted === undefined ? undefined : input.parentContacted ? new Date() : null,
        closureNotes: input.closureNotes,
        outcome: input.outcome,
        escalationLevel: input.escalationLevel,
      },
      select: followUpSelect,
    });
  }, { isolationLevel: "Serializable" }));

  await recordAuditLog({
    actor: access.tenant,
    module: "ACADEMICS",
    action: "UPDATE",
    entityType: "STUDENT_FOLLOW_UP",
    entityId: updated.id,
    summary: "Updated a student follow-up.",
    metadata: { status: updated.status, teacherId: updated.teacher.id },
  });
  return formatFollowUp(updated);
}
