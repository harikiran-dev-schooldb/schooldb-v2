import { apiErrorResponse } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  deleteSupportTicketAttachment,
  saveSupportTicketAttachment,
} from "@/lib/private-storage";
import { supportActor, visibleTicket } from "@/lib/support-tickets";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  let storageKey: string | null = null;

  try {
    const actor = await supportActor();
    const ticket = await visibleTicket((await context.params).id, actor);
    if (ticket.status === "CLOSED") {
      throw new ApiError(400, "Closed tickets cannot receive attachments.");
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "Choose an image or PDF to attach.");
    }

    try {
      storageKey = await saveSupportTicketAttachment(file);
    } catch (error) {
      throw new ApiError(
        400,
        error instanceof Error ? error.message : "Invalid attachment.",
      );
    }

    const attachment = await prisma.$transaction(async (tx) => {
      const created = await tx.supportTicketAttachment.create({
        data: {
          schoolId: actor.schoolId,
          ticketId: ticket.id,
          uploadedById: actor.userId,
          originalName: file.name.slice(0, 255) || "Attachment",
          mimeType: file.type,
          sizeBytes: file.size,
          storageKey: storageKey!,
        },
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
        },
      });

      await tx.supportTicketActivity.create({
        data: {
          schoolId: actor.schoolId,
          ticketId: ticket.id,
          actorId: actor.userId,
          action: "ATTACHMENT_ADDED",
          detail: `Attachment added: ${created.originalName}`,
        },
      });

      return created;
    });

    return Response.json(
      { success: true, data: attachment, message: "Attachment uploaded" },
      { status: 201 },
    );
  } catch (error) {
    if (storageKey) await deleteSupportTicketAttachment(storageKey);
    return apiErrorResponse(error, "Unable to upload attachment.");
  }
}
