import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { readSupportTicketAttachment } from "@/lib/private-storage";
import { supportActor, visibleTicket } from "@/lib/support-tickets";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string; attachmentId: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const actor = await supportActor();
    const { id, attachmentId } = await context.params;
    const ticket = await visibleTicket(id, actor);
    const attachment = await prisma.supportTicketAttachment.findFirst({
      where: {
        id: attachmentId,
        ticketId: ticket.id,
        schoolId: actor.schoolId,
      },
      select: { storageKey: true, originalName: true, mimeType: true },
    });
    if (!attachment) throw new ApiError(404, "Attachment not found.");

    const file = await readSupportTicketAttachment(attachment.storageKey);
    const safeName = attachment.originalName.replace(/["\r\n]/g, "_");
    return new Response(file, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return Response.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Unable to open attachment",
      },
      { status },
    );
  }
}
