import { z } from "zod";

import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { listAccessibleStudents } from "@/lib/student-access";
import { sendSupportPush, supportAdminUserIds } from "@/lib/support-push";

type Context = { params: Promise<{ id: string }> };

const actionInput = z.object({
  action: z.enum(["CONFIRM_RESOLVED", "REOPEN"]),
});

async function familyTicket(id: string) {
  const { membership, students } = await listAccessibleStudents();
  const ticket = await prisma.supportTicket.findFirst({
    where: {
      id,
      schoolId: membership.schoolId,
      createdById: membership.userId,
      studentId: { in: students.map((student) => student.id) },
    },
    select: {
      id: true,
      schoolId: true,
      ticketNo: true,
      subject: true,
      description: true,
      type: true,
      priority: true,
      status: true,
      source: true,
      studentId: true,
      createdById: true,
      assignedToId: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      student: {
        select: { id: true, admissionNo: true, fullName: true },
      },
      assignedTo: {
        select: { id: true, firstName: true, lastName: true },
      },
      messages: {
        where: { isInternal: false },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          authorId: true,
          body: true,
          createdAt: true,
          author: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      activities: {
        where: {
          action: {
            in: [
              "CREATED",
              "STATUS_CHANGED",
              "ASSIGNMENT_CHANGED",
              "REPLY_ADDED",
            ],
          },
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          action: true,
          detail: true,
          createdAt: true,
        },
      },
    },
  });

  if (!ticket) throw new ApiError(404, "Ticket not found");
  return { membership, ticket };
}

export async function GET(_request: Request, context: Context) {
  return apiHandler(async () => {
    const { ticket } = await familyTicket((await context.params).id);
    return ApiResponse.success(ticket);
  });
}

export async function POST(request: Request, context: Context) {
  return apiHandler(async () => {
    const id = (await context.params).id;
    const { membership, ticket } = await familyTicket(id);
    const input = actionInput.safeParse(await request.json());
    if (!input.success) throw new ApiError(400, "Invalid ticket action.");

    if (ticket.status !== "RESOLVED") {
      throw new ApiError(
        400,
        input.data.action === "REOPEN"
          ? "Only a resolved ticket can be reopened."
          : "Only a resolved ticket can be confirmed and closed.",
      );
    }

    const nextStatus = input.data.action === "REOPEN" ? "REOPENED" : "CLOSED";
    const detail =
      input.data.action === "REOPEN"
        ? "Requester reopened the ticket"
        : "Requester confirmed resolution and closed the ticket";

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: nextStatus,
          resolvedAt: nextStatus === "REOPENED" ? null : ticket.resolvedAt,
        },
      });

      await tx.supportTicketActivity.create({
        data: {
          schoolId: membership.schoolId,
          ticketId: ticket.id,
          actorId: membership.userId,
          action: "STATUS_CHANGED",
          detail,
        },
      });

      return result;
    });

    const recipients = new Set<string>(await supportAdminUserIds(membership.schoolId));
    if (ticket.assignedToId) recipients.add(ticket.assignedToId);

    await sendSupportPush({
      schoolId: membership.schoolId,
      userIds: [...recipients],
      excludeUserId: membership.userId,
      title:
        nextStatus === "REOPENED"
          ? `${ticket.ticketNo} reopened`
          : `${ticket.ticketNo} closed`,
      body: detail,
      ticketId: ticket.id,
      ticketNo: ticket.ticketNo,
    }).catch((error) => console.error("Support push failed", error));

    return ApiResponse.success(updated, detail);
  });
}
