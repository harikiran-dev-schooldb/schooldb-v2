import { sendDueSupportFollowUps } from "@/lib/support-follow-ups";
import { queueAdmissionReminders } from "@/features/admissions/reminders.service";
import { processPendingPushDeliveries } from "@/features/notifications/push-queue";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let admissions: {schoolsWithReminders:number}|{error:string};
  try { admissions=await queueAdmissionReminders(); } catch(error) { console.error("Admission reminder generation failed",error); admissions={error:"Reminder generation failed."}; }
  let support: {remindersDispatched:number}|{error:string};
  try { support = await sendDueSupportFollowUps(); } catch (error) { console.error("Support reminders failed", error); support = { error: "Reminder dispatch failed." }; }
  const result = await processPendingPushDeliveries();
  return Response.json({ ok: true, ...result, admissions, support });
}
