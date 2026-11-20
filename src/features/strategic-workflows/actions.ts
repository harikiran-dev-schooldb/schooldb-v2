"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { canCreateStrategicWorkflow, canUpdateStrategicWorkflow } from "./access";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT", "RECEPTIONIST"];
const workflowTypes = [
  "LESSON_PLAN",
  "ASSIGNMENT_SUBMISSION",
  "PARENT_TEACHER_MEETING",
  "STUDENT_WELLBEING",
  "TRANSPORT_SAFETY",
  "PROCUREMENT",
  "TIMETABLE_SUBSTITUTION",
  "EARLY_WARNING",
] as const;
const workflowStatuses = ["DRAFT", "OPEN", "IN_PROGRESS", "WAITING", "COMPLETED", "CANCELLED"] as const;

export type WorkflowActionState = { error: string; success: boolean; message?: string };
const emptyState: WorkflowActionState = { error: "", success: false };

const createSchema = z.object({
  type: z.enum(workflowTypes),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().max(5000),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]),
  ownerUserId: z.string().trim().max(100),
  studentEnrollmentId: z.string().trim().max(100),
  teacherId: z.string().trim().max(100),
  startsAt: z.string().trim().max(40),
  dueAt: z.string().trim().max(40),
  location: z.string().trim().max(180),
  confidential: z.string().optional(),
});

function optionalDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Enter a valid date and time.");
  return date;
}

function workflowPath(schoolSlug: string) {
  return `/${schoolSlug}/strategic-workflows`;
}

export async function createStrategicWorkflow(
  schoolSlug: string,
  _previous: WorkflowActionState = emptyState,
  formData: FormData,
): Promise<WorkflowActionState> {
  void _previous;
  const actor = await requireRole(allowedRoles, schoolSlug);
  if (!canCreateStrategicWorkflow(actor)) return { error: "You do not have permission to create workflows.", success: false };
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Complete the required fields.", success: false };

  const input = parsed.data;
  try {
    const startsAt = optionalDate(input.startsAt);
    const dueAt = optionalDate(input.dueAt);
    if (startsAt && dueAt && dueAt < startsAt) {
      return { error: "The due date cannot be earlier than the start date.", success: false };
    }

    const [owner, enrollment, teacher] = await Promise.all([
      input.ownerUserId
        ? prisma.membership.findFirst({ where: { schoolId: actor.schoolId, userId: input.ownerUserId, isActive: true }, select: { userId: true } })
        : Promise.resolve(null),
      input.studentEnrollmentId
        ? prisma.studentEnrollment.findFirst({ where: { id: input.studentEnrollmentId, schoolId: actor.schoolId }, select: { id: true } })
        : Promise.resolve(null),
      input.teacherId
        ? prisma.teacher.findFirst({ where: { id: input.teacherId, schoolId: actor.schoolId, active: true }, select: { id: true } })
        : Promise.resolve(null),
    ]);
    if (input.ownerUserId && !owner) return { error: "Choose an active staff owner.", success: false };
    if (input.studentEnrollmentId && !enrollment) return { error: "Choose a student from this school.", success: false };
    if (input.teacherId && !teacher) return { error: "Choose an active teacher.", success: false };

    const confidential = input.confidential === "on" || input.type === "STUDENT_WELLBEING";
    const workflow = await prisma.$transaction(async (tx) => {
      const created = await tx.strategicWorkflow.create({
        data: {
          schoolId: actor.schoolId,
          type: input.type,
          title: input.title,
          description: input.description || null,
          priority: input.priority,
          confidential,
          ownerUserId: owner?.userId ?? null,
          createdByUserId: actor.userId,
          studentEnrollmentId: enrollment?.id ?? null,
          teacherId: teacher?.id ?? null,
          startsAt,
          dueAt,
          location: input.location || null,
          metadata: { source: "MANUAL" },
          events: {
            create: {
              schoolId: actor.schoolId,
              actorUserId: actor.userId,
              type: "CREATED",
              message: "Workflow created.",
            },
          },
        },
        select: { id: true, title: true, type: true },
      });
      await writeAuditLog(tx, {
        actor,
        module: "SYSTEM",
        action: "CREATE",
        entityType: "STRATEGIC_WORKFLOW",
        entityId: created.id,
        summary: `Created ${created.type.toLowerCase().replaceAll("_", " ")} workflow: ${created.title}.`,
      });
      return created;
    });
    revalidatePath(workflowPath(schoolSlug));
    return { error: "", success: true, message: `${workflow.title} was created.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create the workflow.", success: false };
  }
}

const updateSchema = z.object({
  status: z.enum(workflowStatuses),
  comment: z.string().trim().max(2000),
});

export async function updateStrategicWorkflow(
  schoolSlug: string,
  workflowId: string,
  _previous: WorkflowActionState,
  formData: FormData,
): Promise<WorkflowActionState> {
  void _previous;
  const actor = await requireRole(allowedRoles, schoolSlug);
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Choose a valid status.", success: false };
  const input = parsed.data;

  const existing = await prisma.strategicWorkflow.findFirst({
    where: { id: workflowId, schoolId: actor.schoolId },
    select: { id: true, title: true, status: true, confidential: true, ownerUserId: true, createdByUserId: true },
  });
  if (!existing) return { error: "Workflow not found.", success: false };
  if (!canUpdateStrategicWorkflow(actor, existing)) {
    return { error: "You do not have permission to update this workflow.", success: false };
  }

  await prisma.$transaction(async (tx) => {
    await tx.strategicWorkflow.update({
      where: { id: existing.id },
      data: {
        status: input.status,
        completedAt: input.status === "COMPLETED" ? new Date() : existing.status === "COMPLETED" ? null : undefined,
        events: {
          create: [
            ...(existing.status !== input.status ? [{ schoolId: actor.schoolId, actorUserId: actor.userId, type: input.status === "COMPLETED" ? "COMPLETED" as const : "STATUS_CHANGED" as const, message: `Status changed from ${existing.status} to ${input.status}.` }] : []),
            ...(input.comment ? [{ schoolId: actor.schoolId, actorUserId: actor.userId, type: "COMMENT" as const, message: input.comment }] : []),
          ],
        },
      },
    });
    await writeAuditLog(tx, {
      actor,
      module: "SYSTEM",
      action: "UPDATE",
      entityType: "STRATEGIC_WORKFLOW",
      entityId: existing.id,
      summary: `Updated workflow ${existing.title} to ${input.status.toLowerCase().replaceAll("_", " ")}.`,
      metadata: { previousStatus: existing.status, status: input.status, commentAdded: Boolean(input.comment) },
    });
  });
  revalidatePath(workflowPath(schoolSlug));
  return { error: "", success: true, message: "Workflow updated." };
}

export async function generateEarlyWarnings(
  schoolSlug: string,
  _previous: WorkflowActionState,
): Promise<WorkflowActionState> {
  void _previous;
  const actor = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);
  const activeYear = await prisma.academicYear.findFirst({
    where: { schoolId: actor.schoolId, active: true },
    orderBy: { startDate: "desc" },
    select: { id: true, name: true },
  });
  if (!activeYear) return { error: "Create an active academic year before scanning risk.", success: false };

  const failedMarks = await prisma.studentExamMark.findMany({
    where: {
      schoolId: actor.schoolId,
      status: { in: ["PRESENT", "ABSENT"] },
      studentEnrollment: { academicYearId: activeYear.id, active: true, student: { status: "ACTIVE" } },
      examSchedule: { exam: { academicYearId: activeYear.id, status: { in: ["PUBLISHED", "COMPLETED"] } } },
    },
    select: {
      status: true,
      marksObtained: true,
      studentEnrollmentId: true,
      examSchedule: { select: { passMarks: true, assessmentType: true } },
    },
  });
  const failures = new Map<string, number>();
  for (const mark of failedMarks) {
    const failed = mark.status === "ABSENT" || (
      mark.examSchedule.assessmentType === "MARKS" &&
      mark.examSchedule.passMarks !== null &&
      mark.marksObtained !== null &&
      Number(mark.marksObtained) < Number(mark.examSchedule.passMarks)
    );
    if (failed) failures.set(mark.studentEnrollmentId, (failures.get(mark.studentEnrollmentId) ?? 0) + 1);
  }
  if (failures.size === 0) return { error: "", success: true, message: "No new academic-risk signals were found." };

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { id: { in: [...failures.keys()] }, schoolId: actor.schoolId, academicYearId: activeYear.id, active: true },
    select: {
      id: true,
      student: { select: { fullName: true, admissionNo: true } },
      class: { select: { name: true } },
      section: { select: { name: true } },
    },
  });
  const existing = await prisma.strategicWorkflow.findMany({
    where: {
      schoolId: actor.schoolId,
      type: "EARLY_WARNING",
      studentEnrollmentId: { in: enrollments.map(({ id }) => id) },
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
    select: { studentEnrollmentId: true },
  });
  const existingIds = new Set(existing.map(({ studentEnrollmentId }) => studentEnrollmentId));
  const candidates = enrollments.filter(({ id }) => !existingIds.has(id)).slice(0, 200);

  await prisma.$transaction(async (tx) => {
    for (const enrollment of candidates) {
      const failureCount = failures.get(enrollment.id) ?? 0;
      await tx.strategicWorkflow.create({
        data: {
          schoolId: actor.schoolId,
          type: "EARLY_WARNING",
          title: `Academic risk · ${enrollment.student.fullName || enrollment.student.admissionNo}`,
          description: `${failureCount} failed or absent subject result${failureCount === 1 ? "" : "s"} detected for ${enrollment.class.name}-${enrollment.section.name}. Review the subject pattern and agree an intervention with the family.`,
          status: "OPEN",
          priority: failureCount >= 3 ? "HIGH" : "NORMAL",
          confidential: true,
          ownerUserId: actor.userId,
          createdByUserId: actor.userId,
          studentEnrollmentId: enrollment.id,
          dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          metadata: { source: "ACADEMIC_RISK_SCAN", academicYear: activeYear.name, failedSubjects: failureCount } satisfies Prisma.InputJsonValue,
          events: { create: { schoolId: actor.schoolId, actorUserId: actor.userId, type: "CREATED", message: "Created by the academic-risk scan." } },
        },
      });
    }
    if (candidates.length > 0) {
      await writeAuditLog(tx, {
        actor,
        module: "ACADEMICS",
        action: "CREATE",
        entityType: "EARLY_WARNING_BATCH",
        summary: `Created ${candidates.length} early-warning workflow${candidates.length === 1 ? "" : "s"} from examination risk signals.`,
        metadata: { academicYear: activeYear.name, created: candidates.length },
      });
    }
  });
  revalidatePath(workflowPath(schoolSlug));
  return { error: "", success: true, message: candidates.length > 0 ? `Created ${candidates.length} early-warning workflows.` : "All detected risks already have an active workflow." };
}
