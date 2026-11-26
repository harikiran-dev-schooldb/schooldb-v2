import { queueStaffAdmissionReminders } from "@/features/admissions/staff-reminders.service";
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
  let staff: {staffRemindersQueued:number}|{error:string};
  try { staff=await queueStaffAdmissionReminders(); } catch(error) { console.error("Admission staff reminders failed",error); staff={error:"Staff reminder generation failed."}; }
  const result = await processPendingPushDeliveries();
  return Response.json({ ok: true, ...result, admissions, staff });
}
