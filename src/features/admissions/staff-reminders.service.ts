import { prisma } from "@/lib/prisma";
import { appointmentKey, appointmentWindow, indiaDay } from "./reminder-policy";
import type { Prisma } from "@/generated/prisma/client";

type Notice={schoolId:string;memberId:string;key:string;title:string;body:string;expiresAt:Date};
async function enqueue(notice:Notice,now:Date){
 return prisma.$transaction(async tx=>{
  const member=await tx.membership.findFirst({where:{id:notice.memberId,schoolId:notice.schoolId,isActive:true,role:{in:["SUPER_ADMIN","SCHOOL_ADMIN","RECEPTIONIST","TEACHER"]}},select:{id:true}});
  const setting=await tx.schoolAdmissionSetting.findUnique({where:{schoolId:notice.schoolId},select:{admissionRemindersEnabled:true}});
  if(!member||!setting?.admissionRemindersEnabled)return false;
  const announcement=await tx.announcement.upsert({where:{dedupeKey:notice.key},create:{schoolId:notice.schoolId,title:notice.title,body:notice.body,category:"GENERAL",priority:"NORMAL",targetType:"ADMISSION_STAFF",targetId:notice.memberId,targetLabel:"Assigned admissions staff",sourceType:"ADMISSION_STAFF_REMINDER",dedupeKey:notice.key,createdBy:"SYSTEM",publishedAt:now,expiresAt:notice.expiresAt},update:{},select:{id:true}});
  await tx.pushDeliveryJob.upsert({where:{announcementId:announcement.id},create:{schoolId:notice.schoolId,announcementId:announcement.id,nextAttemptAt:now},update:{}});
  return true;
 });
}
const enabledApplication:Prisma.AdmissionApplicationWhereInput={academicYear:{admissionsEnabled:true},status:{in:["SUBMITTED","UNDER_REVIEW","WAITLISTED"]}};
export async function queueStaffAdmissionReminders(now=new Date(),mode:"daily"|"timed"="daily"){
 const settings=await prisma.schoolAdmissionSetting.findMany({where:{admissionRemindersEnabled:true},select:{schoolId:true}});
 let queued=0;
 for(const {schoolId} of settings){
  const next=new Date(now.getTime()+24*60*60*1000);
  const window=mode==="timed"?appointmentWindow(now):{lte:next};
  const [entrance,interviews,tasks]=await Promise.all([
   prisma.admissionApplication.findMany({where:{...enabledApplication,schoolId,entranceStage:"SCHEDULED",entranceAt:window,entranceMemberId:{not:null}},select:{id:true,entranceAt:true,entranceMemberId:true},orderBy:{entranceAt:"asc"},take:500}),
   prisma.admissionApplication.findMany({where:{...enabledApplication,schoolId,interviewStage:"SCHEDULED",interviewAt:window,interviewMemberId:{not:null}},select:{id:true,interviewAt:true,interviewMemberId:true},orderBy:{interviewAt:"asc"},take:500}),
   mode==="daily"?prisma.admissionContactTask.groupBy({by:["assignedMemberId"],where:{schoolId,completedAt:null,dueAt:{lte:next},OR:[{application:{academicYear:{admissionsEnabled:true},status:{in:["DRAFT","SUBMITTED","UNDER_REVIEW","APPROVED","WAITLISTED"]}}},{enquiry:{academicYear:{admissionsEnabled:true},state:{in:["OPEN","LINKED"]}}}]},_count:{_all:true}}):Promise.resolve([]),
  ]);
  const counts=new Map<string,{followups:number;entrance:number;interviews:number}>();
  const get=(id:string)=>{const x=counts.get(id)??{followups:0,entrance:0,interviews:0};counts.set(id,x);return x;};
  for(const task of tasks)get(task.assignedMemberId).followups+=task._count._all;
  const appointments=[...entrance.map(a=>({id:a.id,at:a.entranceAt,member:a.entranceMemberId,stage:"entrance"})),...interviews.map(a=>({id:a.id,at:a.interviewAt,member:a.interviewMemberId,stage:"interview"}))];
  for(const a of appointments){if(!a.at||!a.member)continue;if(mode==="daily"){if(a.stage==="entrance")get(a.member).entrance++;else get(a.member).interviews++;continue;}
   const at=new Intl.DateTimeFormat("en-IN",{timeZone:"Asia/Kolkata",hour:"numeric",minute:"2-digit",hour12:true}).format(a.at);
   if(await enqueue({schoolId,memberId:a.member,key:appointmentKey(schoolId,a.id,a.stage,a.member,a.at),title:a.stage==="entrance"?"Upcoming entrance examination":"Upcoming admission interview",body:"An assigned admission appointment is scheduled at "+at+" IST within 30 minutes. Check Admissions for the latest details.",expiresAt:a.at},now))queued++;
  }
  if(mode==="daily")for(const [memberId,n] of counts){
   if(await enqueue({schoolId,memberId,key:"admission-staff-daily:"+schoolId+":"+memberId+":"+indiaDay(now),title:"Your admissions tasks",body:`Due or overdue in the next 24 hours: ${n.followups} follow-ups, ${n.entrance} entrance examinations, ${n.interviews} interviews. Review your assigned tasks in SchoolDB.`,expiresAt:next},now))queued++;
  }
 }
 return {staffRemindersQueued:queued};
}
