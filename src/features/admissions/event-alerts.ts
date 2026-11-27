import { prisma } from "@/lib/prisma";
import { isRouteAllowed } from "@/lib/route-access";
import { processPushDeliveryJob } from "@/features/notifications/push-queue";

const titles = {
  ENQUIRY:"New admission enquiry", APPLICATION:"New admission application",
  SUBMITTED:"Application submitted", UNDER_REVIEW:"Application under review",
  APPROVED:"Admission approved", WAITLISTED:"Application waitlisted",
  REJECTED:"Application decision updated", CONVERTED:"Admission completed",
  ENTRANCE:"Entrance examination updated", INTERVIEW:"Admission interview updated"
} as const;
export type AdmissionAlertKind = keyof typeof titles;

/** Best-effort after a successful write; announcement and queue entry are atomic.
 * Never include student names, parent contacts, document or eligibility details. */
export async function notifyAdmissionEvent(schoolId:string,kind:AdmissionAlertKind,recordId:string,revision="initial") {
  try {
    const job=await prisma.$transaction(async(tx)=>{
      const setting=await tx.schoolAdmissionSetting.findUnique({where:{schoolId},select:{admissionEventAlertsEnabled:true,school:{select:{routeAccessRestricted:true,allowedRoutes:true}}}});
      if(!setting?.admissionEventAlertsEnabled||!isRouteAllowed(setting.school,"admissions")||!isRouteAllowed(setting.school,"notification-inbox"))return null;
      const admin=await tx.membership.findFirst({where:{schoolId,isActive:true,role:{in:["SUPER_ADMIN","SCHOOL_ADMIN"]}},select:{userId:true}});
      if(!admin)return null;
      const key="admission-event:"+schoolId+":"+kind+":"+recordId+":"+revision;
      const now=new Date();
      const announcement=await tx.announcement.upsert({where:{dedupeKey:key},create:{schoolId,title:titles[kind],body:"An admissions record needs your attention. Open the Admissions workspace to review the details.",category:"GENERAL",priority:"NORMAL",targetType:"ADMIN",targetLabel:"School administrators",sourceType:"ADMISSION_EVENT",sourceId:recordId,dedupeKey:key,createdBy:admin.userId,publishedAt:now,expiresAt:new Date(now.getTime()+7*86400000)},update:{},select:{id:true}});
      return tx.pushDeliveryJob.upsert({where:{announcementId:announcement.id},create:{schoolId,announcementId:announcement.id,nextAttemptAt:now},update:{},select:{id:true}});
    });
    if(job)await processPushDeliveryJob(job.id);
  }catch(error){console.error("Admission event notification failed",error);}
}
