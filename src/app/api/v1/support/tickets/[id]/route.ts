import { SupportTicketPriority, SupportTicketStatus } from "@/generated/prisma/enums";
import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { assertSupportStatusTransition, supportActor, visibleTicket } from "@/lib/support-tickets";
import { sendSupportPush, supportAdminUserIds } from "@/lib/support-push";
import { supportSla } from "@/lib/support-sla";
import {
  queueParentQueryWhatsappUpdate,
  queueSupportAssignmentWhatsappAlert,
} from "@/features/whatsapp/service";

type Context = { params: Promise<{ id: string }> };
const updateInput = z.object({
  status: z.enum(SupportTicketStatus).optional(),
  priority: z.enum(SupportTicketPriority).optional(),
  assignedToId: z.string().min(1).nullable().optional(),
  labels: z.array(z.string().trim().min(1).max(24)).max(8).optional(),
  duplicateOfId: z.string().min(1).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0);

export async function GET(_request: Request, context: Context) {
  return apiHandler(async () => {
    const actor = await supportActor();
    const ticket = await visibleTicket((await context.params).id, actor);
    const firstResponse = ticket.messages.find((message) => !message.isInternal)?.createdAt;
    const delivery = ticket.source === "PARENT_QR"
      ? await prisma.whatsappCampaign.findFirst({
          where: { schoolId: actor.schoolId, sourceType: "PARENT_QUERY", sourceId: ticket.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            updatedAt: true,
            recipients: { take: 1, select: { status: true, errorMessage: true } },
          },
        })
      : null;
    return ApiResponse.success({
      ...ticket,
      sla: supportSla({
        createdAt: ticket.createdAt,
        priority: ticket.priority,
        status: ticket.status,
        firstResponseAt: firstResponse,
        resolvedAt: ticket.resolvedAt,
      }),
      parentDelivery: delivery ? {
        campaignId: delivery.id,
        status: delivery.recipients[0]?.status ?? "QUEUED",
        error: delivery.recipients[0]?.errorMessage ?? null,
        updatedAt: delivery.updatedAt,
      } : null,
    });
  });
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
    if (input.data.duplicateOfId) {
      if (input.data.duplicateOfId === current.id) throw new ApiError(400, "A ticket cannot duplicate itself.");
      const duplicateTarget = await prisma.supportTicket.findFirst({
        where: { id: input.data.duplicateOfId, schoolId: actor.schoolId },
        select: { id: true, ticketNo: true },
      });
      if (!duplicateTarget) throw new ApiError(400, "Duplicate target was not found in this school.");
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
    if (input.data.labels && input.data.labels.join("|") !== current.labels.join("|"))
      changes.push({ action: "LABELS_CHANGED", detail: input.data.labels.length ? `Labels: ${input.data.labels.join(", ")}` : "Labels cleared" });
    if (input.data.duplicateOfId !== undefined && input.data.duplicateOfId !== current.duplicateOfId)
      changes.push({ action: "DUPLICATE_LINK_CHANGED", detail: input.data.duplicateOfId ? "Linked as a duplicate ticket" : "Duplicate link removed" });
    const ticket = await prisma.$transaction(async (tx) => {
      const updated = await tx.supportTicket.update({
        where: { id },
        data: {
          ...input.data,
          labels: input.data.labels ? [...new Set(input.data.labels.map((label) => label.toLowerCase()))] : undefined,
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
        eventKey: `UPDATE:${ticket.updatedAt.toISOString()}`,
        priority: ticket.priority,
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
