import { revalidatePath } from "next/cache";
import { z } from "zod";

import { notifyLeaveRequestSubmitted } from "@/features/notifications/events";
import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { requireStudentAccess } from "@/lib/student-access";
import { validateBody } from "@/lib/validation";

const schema = z.object({
  schoolSlug: z.string().trim().min(1).max(120),
  studentId: z.string().trim().min(1).max(120),
  clientRequestId: z.string().uuid(),
  requestType: z.enum(["LEAVE", "LATE_ARRIVAL", "EARLY_DEPARTURE", "HALF_DAY", "PERMISSION"]),
  startDate: z.string().min(1),
  endDate: z.string(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().trim().min(5).max(2000),
});

function utcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const input = await validateBody(request, schema);
    const context = await requireStudentAccess(input.schoolSlug, input.studentId);
    if (!context.enrollment) return ApiResponse.error("This student does not have an active enrollment.", 400);

    const existing = await prisma.leaveRequest.findUnique({
      where: { clientRequestId: input.clientRequestId },
      select: { id: true },
    });
    if (existing) return ApiResponse.success(existing, "Leave request already synchronized.");

    const startDate = utcDate(input.startDate);
    const endDate = utcDate(input.requestType === "LEAVE" ? input.endDate : input.startDate);
    const durationDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
      return ApiResponse.error("Choose valid leave dates.", 400);
    }
    if (durationDays > 90) return ApiResponse.error("A single leave request cannot exceed 90 days.", 400);

    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        schoolId: context.membership.schoolId,
        studentId: input.studentId,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { id: true },
    });
    if (overlapping) return ApiResponse.error("An overlapping leave request already exists.", 409);

    const created = await prisma.$transaction(async (tx) => {
      const leave = await tx.leaveRequest.create({
        data: {
          clientRequestId: input.clientRequestId,
          schoolId: context.membership.schoolId,
          studentId: input.studentId,
          enrollmentId: context.enrollment!.id,
          requestedBy: context.membership.userId,
          requestType: input.requestType,
          startDate,
          endDate,
          startTime: input.startTime || null,
          endTime: input.endTime || null,
          reason: input.reason,
        },
        select: { id: true },
      });
      await tx.studentActivity.create({
        data: {
          schoolId: context.membership.schoolId,
          studentId: input.studentId,
          enrollmentId: context.enrollment!.id,
          performedByUserId: context.membership.userId,
          type: "LEAVE_REQUEST_CREATED",
          title: "Leave request submitted",
          description: input.reason,
          sourceType: "LEAVE_REQUEST",
          sourceId: leave.id,
          metadata: { requestId: leave.id, requestType: input.requestType },
        },
      });
      return leave;
    });
    await notifyLeaveRequestSubmitted(created.id, context.membership.schoolId).catch((error) => {
      console.error("Unable to create queued leave request notification", error);
    });
    revalidatePath(`/${input.schoolSlug}/my/${input.studentId}/leave-requests`);
    revalidatePath(`/${input.schoolSlug}/leave-requests`);
    return ApiResponse.success(created, "Leave request synchronized.", 201);
  });
}
