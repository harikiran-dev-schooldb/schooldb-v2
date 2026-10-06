import { SupportTicketPriority, SupportTicketStatus } from "@/generated/prisma/enums";
import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { assertSupportStatusTransition, supportActor, visibleTicket } from "@/lib/support-tickets";
import { sendSupportPush, supportAdminUserIds } from "@/lib/support-push";
import {
  queueParentQueryWhatsappUpdate,
  queueSupportAssignmentWhatsappAlert,
} from "@/features/whatsapp/service";

type Context = { params: Promise<{ id: string }> };
const updateInput = z.object({
  status: z.enum(SupportTicketStatus).optional(),
  priority: z.enum(SupportTicketPriority).optional(),
  assignedToId: z.string().min(1).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0);

export async function GET(_request: Request, context: Context) {
  return apiHandler(async () => ApiResponse.success(await visibleTicket((await context.params).id, await supportActor())));
}

export async function PATCH(request: Request, context: Context) {
  return apiHandler(async () => {
    const actor = await supportActor();
    if (!actor.isAdmin) throw new ApiError(403, "Only school admins can manage tickets.");
    const id = (await context.params).id;
    const current = await visibleTicket(id, actor);
    const input = updateInput.safeParse(await request.json());
    if (!input.success) throw new ApiError(400, "Invalid ticket update.");

    const requestedStatus =
      input.data.status ??
      (input.data.assignedToId && !current.assignedToId && current.status === "OPEN"
        ? SupportTicketStatus.ASSIGNED
        : undefined);

    if (requestedStatus) {
      assertSupportStatusTransition(current.status, requestedStatus);
    }

    let assignmentRecipient: {
      id: string;
      name: string;
      phone: string | null;
    } | null = null;
    if (input.data.assignedToId) {
      const assignee = await prisma.membership.findFirst({
        where: { schoolId: actor.schoolId, userId: input.data.assignedToId, isActive: true, role: { notIn: ["PARENT", "STUDENT"] } },
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      });
      if (!assignee) throw new ApiError(400, "Assignee is not active staff in this school.");
      assignmentRecipient = {
        id: assignee.user.id,
        name:
          [assignee.user.firstName, assignee.user.lastName]
            .filter(Boolean)
            .join(" ") || assignee.user.email,
        phone: assignee.user.phone,
      };
    }
    const changes: Array<{ action: string; detail: string }> = [];
    if (requestedStatus && requestedStatus !== current.status)
      changes.push({ action: "STATUS_CHANGED", detail: `Status changed from ${current.status} to ${requestedStatus}` });
    if (input.data.priority && input.data.priority !== current.priority)
      changes.push({ action: "PRIORITY_CHANGED", detail: `Priority changed from ${current.priority} to ${input.data.priority}` });
    if (input.data.assignedToId !== undefined && input.data.assignedToId !== current.assignedToId) {
      const name = assignmentRecipient?.name ?? "Unassigned";
      changes.push({ action: "ASSIGNMENT_CHANGED", detail: input.data.assignedToId ? `Assigned to ${name}` : "Ticket unassigned" });
    }
    const ticket = await prisma.$transaction(async (tx) => {
      const updated = await tx.supportTicket.update({
        where: { id },
        data: {
          ...input.data,
          status: requestedStatus,
          resolvedAt: requestedStatus === "RESOLVED" || requestedStatus === "CLOSED"
            ? current.resolvedAt ?? new Date()
            : requestedStatus ? null : undefined,
        },
      });
      if (changes.length) await tx.supportTicketActivity.createMany({
        data: changes.map((change) => ({
          schoolId: actor.schoolId, ticketId: id, actorId: actor.userId,
          action: change.action, detail: change.detail,
        })),
      });
      return updated;
    });
    const recipients = new Set<string>(current.createdById ? [current.createdById] : []);
    if (ticket.assignedToId) recipients.add(ticket.assignedToId);
    const notifyAllAdmins =
      (requestedStatus && requestedStatus !== current.status) ||
      (input.data.priority === "URGENT" && current.priority !== "URGENT");
    if (notifyAllAdmins) {
      (await supportAdminUserIds(actor.schoolId)).forEach((id) => recipients.add(id));
    }
    const notificationDetail = changes[changes.length - 1]?.detail;
    if (notificationDetail) {
      await sendSupportPush({
        schoolId: actor.schoolId,
        userIds: [...recipients],
        excludeUserId: actor.userId,
        title: `${current.ticketNo} updated`,
        body: notificationDetail,
        ticketId: current.id,
        ticketNo: current.ticketNo,
      }).catch((error) => console.error("Support push failed", error));
    }
    const parentStatus = requestedStatus && requestedStatus !== current.status
      ? requestedStatus
      : input.data.assignedToId && input.data.assignedToId !== current.assignedToId
        ? "ASSIGNED"
        : null;
    if (current.source === "PARENT_QR" && current.parentPhone && parentStatus) {
      await queueParentQueryWhatsappUpdate({
        schoolId: actor.schoolId,
        ticketId: current.id,
        ticketNo: current.ticketNo,
        phone: current.parentPhone,
        parentName: current.parentName,
        status: parentStatus,
        eventKey: `update:${ticket.updatedAt.toISOString()}`,
      }).catch((error) => console.error("Parent query WhatsApp failed", error));
    }
    if (
      assignmentRecipient &&
      input.data.assignedToId !== current.assignedToId
    ) {
      await queueSupportAssignmentWhatsappAlert({
        schoolId: actor.schoolId,
        ticketId: current.id,
        ticketNo: current.ticketNo,
        subject: current.subject,
        description: current.description,
        assigneeId: assignmentRecipient.id,
        assigneeName: assignmentRecipient.name,
        phone: assignmentRecipient.phone,
        eventKey: ticket.updatedAt.toISOString(),
      }).catch((error) =>
        console.error("Support assignment WhatsApp failed", error),
      );
    }

    return ApiResponse.success(ticket);
  });
}

// The Android client uses POST for updates because HttpURLConnection does not support PATCH.
export const POST = PATCH;
