import {
  processReadyAutomatedCampaigns,
  queueDailyBirthdayWishes,
} from "@/features/whatsapp/automation";
import { notifyDailyBirthdays } from "@/features/notifications/events";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appBirthdays = await notifyDailyBirthdays();
  const birthdayCampaigns = await queueDailyBirthdayWishes();
  const processed = await processReadyAutomatedCampaigns();
  return Response.json({
    ok: true,
    appBirthdayNotifications: appBirthdays,
    birthdayCampaignsQueued: birthdayCampaigns.length,
    campaignsProcessed: processed.filter(Boolean).length,
  });
}
