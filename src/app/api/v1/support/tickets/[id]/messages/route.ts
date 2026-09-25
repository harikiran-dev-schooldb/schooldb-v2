import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { supportActor, visibleTicket } from "@/lib/support-tickets";
import { sendSupportPush, supportAdminUserIds } from "@/lib/support-push";
import { queueParentQueryWhatsappReply } from "@/features/whatsapp/service";

type Context = { params: Promise<{ id: string }> };
const inputSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  isInternal: z.boolean().default(false),
});

export async function POST(request: Request, context: Context) {
  return apiHandler(async () => {
    const actor = await supportActor();
    if (!actor.isAdmin) throw new ApiError(403, "Only school admins can reply to tickets.");
    const ticket = await visibleTicket((await context.params).id, actor);
    if (ticket.status === "CLOSED") throw new ApiError(400, "Closed tickets cannot receive replies.");
    const input = inputSchema.safeParse(await request.json());
    if (!input.success) throw new ApiError(400, "Enter a reply of up to 5000 characters.");
    if (input.data.isInternal && !actor.isAdmin) {
      throw new ApiError(403, "Only school admins can add internal notes.");
    }
    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.supportTicketMessage.create({
        data: {
          schoolId: actor.schoolId,
          ticketId: ticket.id,
          authorId: actor.userId,
          body: input.data.body,
          isInternal: input.data.isInternal,
        },
      });
      await tx.supportTicketActivity.create({
        data: {
          schoolId: actor.schoolId, ticketId: ticket.id, actorId: actor.userId,
          action: input.data.isInternal ? "INTERNAL_NOTE_ADDED" : "REPLY_ADDED",
          detail: input.data.isInternal ? "Internal note added" : "Reply added",
        },
      });
      return created;
    });
    const recipients = input.data.isInternal
      ? ticket.assignedToId
        ? [ticket.assignedToId, ...(await supportAdminUserIds(actor.schoolId))]
        : await supportAdminUserIds(actor.schoolId)
      : ticket.assignedToId
        ? [ticket.createdById, ticket.assignedToId]
        : [ticket.createdById, ...(await supportAdminUserIds(actor.schoolId))];
    await sendSupportPush({
      schoolId: actor.schoolId,
      userIds: recipients.filter((id): id is string => Boolean(id)),
      excludeUserId: actor.userId,
      title: input.data.isInternal ? `Internal note · ${ticket.ticketNo}` : `New reply · ${ticket.ticketNo}`,
      body: input.data.body.length > 120 ? input.data.body.slice(0, 117) + "..." : input.data.body,
      ticketId: ticket.id,
      ticketNo: ticket.ticketNo,
    }).catch((error) => console.error("Support push failed", error));

    if (!input.data.isInternal && ticket.source === "PARENT_QR" && ticket.parentPhone) {
      await queueParentQueryWhatsappReply({
        schoolId: actor.schoolId,
        ticketId: ticket.id,
        ticketNo: ticket.ticketNo,
        phone: ticket.parentPhone,
        parentName: ticket.parentName,
        reply: input.data.body,
        messageId: message.id,
      }).catch((error) => console.error("Parent query WhatsApp reply failed", error));
    }

    return ApiResponse.success(
      message,
      input.data.isInternal ? "Internal note added" : "Reply added",
      201,
    );
  });
}
