import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { supportActor, visibleTicket } from "@/lib/support-tickets";
import { processWhatsappCampaignBatch } from "@/features/whatsapp/service";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  return apiHandler(async () => {
    const actor = await supportActor();
    if (!actor.isAdmin) throw new ApiError(403, "Only school admins can retry parent delivery.");
    const ticket = await visibleTicket((await context.params).id, actor);
    const campaign = await prisma.whatsappCampaign.findFirst({
      where: { schoolId: actor.schoolId, sourceType: "PARENT_QUERY", sourceId: ticket.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!campaign) throw new ApiError(404, "No parent delivery was found for this ticket.");
    await prisma.whatsappRecipient.updateMany({
      where: { campaignId: campaign.id, status: "FAILED" },
      data: { status: "QUEUED", errorMessage: null, failedAt: null },
    });
    await prisma.whatsappCampaign.update({
      where: { id: campaign.id },
      data: { status: "QUEUED", completedAt: null },
    });
    await processWhatsappCampaignBatch(actor.schoolId, campaign.id, 1);
    return ApiResponse.success({ retried: true });
  });
}
