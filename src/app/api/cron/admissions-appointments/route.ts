import { queueStaffAdmissionReminders } from "@/features/admissions/staff-reminders.service";
import { processPendingPushDeliveries } from "@/features/notifications/push-queue";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const maxDuration=60;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`)return Response.json({error:"Unauthorized"},{status:401});
 const reminders=await queueStaffAdmissionReminders(new Date(),"timed");
 const delivery=await processPendingPushDeliveries(50);
 return Response.json({ok:true,...reminders,...delivery});
}
