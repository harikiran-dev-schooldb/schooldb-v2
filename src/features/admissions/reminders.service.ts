import { prisma } from "@/lib/prisma";
// Only opt-in school administrators receive a generic daily summary.
// No student names, phone numbers, document details, or parent notifications.
export async function queueAdmissionReminders(now=new Date()) {
 const day=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
 const next=new Date(now.getTime()+24*60*60*1000);
 const schools=await prisma.schoolAdmissionSetting.findMany({where:{admissionRemindersEnabled:true},select:{schoolId:true}});
 let queued=0;
 for(const {schoolId} of schools){
  const [followUps,entrance,interviews,admin,documents,drafts,fees]=await Promise.all([
   prisma.admissionContactTask.count({where:{schoolId,completedAt:null,dueAt:{lte:next},OR:[{application:{academicYear:{admissionsEnabled:true},status:{in:["DRAFT","SUBMITTED","UNDER_REVIEW","APPROVED","WAITLISTED"]}}},{enquiry:{academicYear:{admissionsEnabled:true},state:{in:["OPEN","LINKED"]}}}]}}),
   prisma.admissionApplication.count({where:{schoolId,academicYear:{admissionsEnabled:true},status:{in:["SUBMITTED","UNDER_REVIEW","WAITLISTED"]},entranceStage:"SCHEDULED",entranceAt:{lte:next}}}),
   prisma.admissionApplication.count({where:{schoolId,academicYear:{admissionsEnabled:true},status:{in:["SUBMITTED","UNDER_REVIEW","WAITLISTED"]},interviewStage:"SCHEDULED",interviewAt:{lte:next}}}),
   prisma.membership.findFirst({where:{schoolId,isActive:true,role:{in:["SUPER_ADMIN","SCHOOL_ADMIN"]}},select:{userId:true}}),
   prisma.admissionApplication.count({where:{schoolId,academicYear:{admissionsEnabled:true},status:{in:["DRAFT","SUBMITTED","UNDER_REVIEW","WAITLISTED"]},documentReviewRequired:true,OR:[{documents:{none:{}}},{documents:{some:{reviewStatus:{not:"VERIFIED"}}}}]}}),
   prisma.admissionApplication.count({where:{schoolId,academicYear:{admissionsEnabled:true},status:"DRAFT"}}),
   prisma.$queryRaw<{count:number}[]>`SELECT COUNT(DISTINCT a.id)::int AS count
     FROM "AdmissionApplication" a
     JOIN "AcademicYear" y ON y.id=a."academicYearId" AND y."schoolId"=a."schoolId"
     JOIN "StudentEnrollment" e ON e."studentId"=a."studentId" AND e."academicYearId"=a."academicYearId" AND e."schoolId"=a."schoolId"
     JOIN "StudentFee" f ON f."studentEnrollmentId"=e.id AND f."schoolId"=a."schoolId"
     JOIN "StudentFeeItem" i ON i."studentFeeId"=f.id
     JOIN "StudentFeeInstallment" t ON t."studentFeeItemId"=i.id
     WHERE a."schoolId"=${schoolId} AND a.status='CONVERTED' AND y."admissionsEnabled"=true AND e.active=true AND f.active=true
       AND t.status IN ('PENDING','PARTIAL') AND t."dueDate"<=${now}::date AND t."payableAmount">t."paidAmount"`.then(rows=>rows[0]?.count??0),
  ]);
  if(!admin||!(followUps+entrance+interviews+documents+drafts+fees))continue;
  const key="admission-reminder:"+schoolId+":"+day;
  await prisma.$transaction(async tx=>{
   if(!await tx.schoolAdmissionSetting.findFirst({where:{schoolId,admissionRemindersEnabled:true},select:{id:true}}))return;
   const announcement=await tx.announcement.upsert({where:{dedupeKey:key},create:{schoolId,title:"Admissions action reminder",body:`Due or overdue within the next 24 hours: ${followUps} parent follow-up(s), ${entrance} entrance examination(s), ${interviews} interview(s). Pending: ${documents} required document review(s), ${drafts} draft application(s), ${fees} converted application(s) with due ERP installments on enabled admissions years. Open SchoolDB to review.`,category:"GENERAL",priority:"NORMAL",targetType:"ADMIN",targetLabel:"School administrators",sourceType:"ADMISSION_REMINDER",dedupeKey:key,createdBy:admin.userId,publishedAt:now,expiresAt:next},update:{},select:{id:true}});
   await tx.pushDeliveryJob.upsert({where:{announcementId:announcement.id},create:{schoolId,announcementId:announcement.id,nextAttemptAt:now},update:{}});
  });
  queued++;
 }
 return {schoolsWithReminders:queued};
}
