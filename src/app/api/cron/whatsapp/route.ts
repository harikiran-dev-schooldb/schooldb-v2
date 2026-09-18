import {
  processReadyAutomatedCampaigns,
  queueDailyBirthdayWishes,
  queueDailyFeeDueAlerts,
} from "@/features/whatsapp/automation";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const birthdayCampaigns = await queueDailyBirthdayWishes();
  const feeCampaigns = await queueDailyFeeDueAlerts();
  const processed = await processReadyAutomatedCampaigns();
  return Response.json({
    ok: true,
    birthdayCampaignsQueued: birthdayCampaigns.length,
    feeCampaignsQueued: feeCampaigns.length,
    campaignsProcessed: processed.filter(Boolean).length,
  });
}
