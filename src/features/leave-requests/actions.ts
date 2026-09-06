"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole, requireTeacherClassSection } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireStudentAccess } from "@/lib/student-access";

export type LeaveActionState = { error: string; success: boolean };

const requestSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().trim().min(5).max(2000),
});

function dateAtUtcMidnight(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function createLeaveRequest(
  schoolSlug: string,
  studentId: string,
  _: LeaveActionState,
  formData: FormData,
): Promise<LeaveActionState> {
  const context = await requireStudentAccess(schoolSlug, studentId);
  if (!context.enrollment) {
    return { error: "This student does not have an active enrollment.", success: false };
  }

  const parsed = requestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Choose valid dates and enter a reason of at least 5 characters.", success: false };
  }

  const startDate = dateAtUtcMidnight(parsed.data.startDate);
  const endDate = dateAtUtcMidnight(parsed.data.endDate);
  const durationDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    return { error: "The end date must be the same as or later than the start date.", success: false };
  }
  if (durationDays > 90) {
    return { error: "A single leave request cannot exceed 90 days.", success: false };
  }

  const overlapping = await prisma.leaveRequest.findFirst({
    where: {
      schoolId: context.membership.schoolId,
      studentId,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: { id: true },
  });

  if (overlapping) {
    return { error: "This student already has a pending or approved request for these dates.", success: false };
  }

  await prisma.leaveRequest.create({
    data: {
      schoolId: context.membership.schoolId,
      studentId,
      enrollmentId: context.enrollment.id,
      requestedBy: context.membership.userId,
      startDate,
      endDate,
      reason: parsed.data.reason,
    },
  });

  revalidatePath(`/${schoolSlug}/my/${studentId}/leave-requests`);
  revalidatePath(`/${schoolSlug}/leave-requests`);
  return { error: "", success: true };
}

export async function cancelLeaveRequest(
  schoolSlug: string,
  studentId: string,
  requestId: string,
) {
  const context = await requireStudentAccess(schoolSlug, studentId);
  await prisma.leaveRequest.updateMany({
    where: {
      id: requestId,
      schoolId: context.membership.schoolId,
      studentId,
      status: "PENDING",
    },
    data: { status: "CANCELLED" },
  });
  revalidatePath(`/${schoolSlug}/my/${studentId}/leave-requests`);
  revalidatePath(`/${schoolSlug}/leave-requests`);
}

const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  decisionNote: z.string().trim().min(3).max(1000),
});

export async function decideLeaveRequest(
  schoolSlug: string,
  requestId: string,
  _: LeaveActionState,
  formData: FormData,
): Promise<LeaveActionState> {
  const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"], schoolSlug);
  const parsed = decisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Enter a decision note of at least 3 characters.", success: false };
  }

  const request = await prisma.leaveRequest.findFirst({
    where: { id: requestId, schoolId: membership.schoolId },
    select: {
      status: true,
      enrollment: { select: { classId: true, sectionId: true } },
    },
  });
  if (!request) return { error: "Leave request not found.", success: false };
  if (request.status !== "PENDING") return { error: "This request has already been decided.", success: false };

  await requireTeacherClassSection(
    request.enrollment.classId,
    request.enrollment.sectionId,
    schoolSlug,
  );

  const updated = await prisma.leaveRequest.updateMany({
    where: { id: requestId, schoolId: membership.schoolId, status: "PENDING" },
    data: {
      status: parsed.data.decision,
      decisionNote: parsed.data.decisionNote,
      decidedBy: membership.userId,
      decidedAt: new Date(),
    },
  });
  if (updated.count !== 1) return { error: "This request was already updated. Refresh the page.", success: false };

  revalidatePath(`/${schoolSlug}/leave-requests`);
  revalidatePath(`/${schoolSlug}/my`, "layout");
  return { error: "", success: true };
}
