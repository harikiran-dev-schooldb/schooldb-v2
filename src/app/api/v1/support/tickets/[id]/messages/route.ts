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
  clientRequestId: z.string().uuid().optional(),
});

export async function POST(request: Request, context: Context) {
  return apiHandler(async () => {
    const actor = await supportActor();
    const ticket = await visibleTicket((await context.params).id, actor);
    const input = inputSchema.safeParse(await request.json());
    if (!input.success) throw new ApiError(400, "Enter a reply of up to 5000 characters.");
    if (input.data.isInternal && !actor.isAdmin) {
      throw new ApiError(403, "Only school admins can add internal notes.");
    }
    const requestId = input.data.clientRequestId;
    const existingReply = async () => {
      if (!requestId) return null;
      const existing = await prisma.supportTicketMessage.findUnique({ where: { id: requestId } });
      if (!existing) return null;
      if (existing.schoolId !== actor.schoolId || existing.ticketId !== ticket.id ||
          existing.authorId !== actor.userId || existing.body !== input.data.body || existing.isInternal !== input.data.isInternal) {
        throw new ApiError(409, "Reply request conflicts with an existing message.");
      }
      return existing;
    };
    const existing = await existingReply();
    if (existing) return ApiResponse.success(existing);
    if (ticket.status === "CLOSED") throw new ApiError(400, "Closed tickets cannot receive replies.");
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.supportTicketMessage.create({
        data: {
          ...(requestId ? { id: requestId } : {}),
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
      // Keep the parent ticket's update time in sync with conversation activity.
      await tx.supportTicket.update({ where: { id: ticket.id }, data: { updatedAt: new Date() } });
      return { message: created, replay: false };
    }).catch(async (error: unknown) => {
      const duplicate = await existingReply();
      if (duplicate) return { message: duplicate, replay: true };
      throw error;
    });
    const { message, replay } = result;
    if (replay) return ApiResponse.success(message);
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
      eventKey: `MESSAGE:${message.id}`,
      priority: ticket.priority,
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
