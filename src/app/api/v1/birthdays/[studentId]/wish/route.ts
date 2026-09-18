import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";
import { processAutomatedCampaign } from "@/features/whatsapp/automation";
import { queueAutomatedWhatsappAlert } from "@/features/whatsapp/service";

const ADMIN_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN"] as const;

function indiaDateKey(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { year:"numeric", month:"2-digit", day:"2-digit", timeZone:"Asia/Kolkata" }).format(value);
}
function indiaMonthDay(value: Date) {
  const parts=new Intl.DateTimeFormat("en-US",{month:"numeric",day:"numeric",timeZone:"Asia/Kolkata"}).formatToParts(value);
  return [Number(parts.find(p=>p.type==="month")?.value),Number(parts.find(p=>p.type==="day")?.value)];
}

export async function POST(_req:Request,{params}:{params:Promise<{studentId:string}>}) {
 return apiHandler(async()=>{
  const tenant=await requireRole([...ADMIN_ROLES]);const{studentId}=await params;
  const student=await prisma.student.findFirst({where:{id:studentId,schoolId:tenant.schoolId,status:"ACTIVE"},select:{id:true,fullName:true,dob:true,whatsappOptIn:true}});
  if(!student)return ApiResponse.error("Student not found.",404);
  const now=new Date();const today=indiaMonthDay(now),dob=indiaMonthDay(student.dob);
  if(today[0]!==dob[0]||today[1]!==dob[1])return ApiResponse.error("Birthday wishes can only be sent on the student's birthday.",400);
  if(!student.whatsappOptIn)return ApiResponse.error("This student is not opted in for WhatsApp.",400);
  const key=`birthday:${student.id}:${indiaDateKey(now)}`;
  const existing=await prisma.whatsappCampaign.findFirst({where:{schoolId:tenant.schoolId,automationKey:key},select:{id:true,status:true,sentCount:true,deliveredCount:true,readCount:true,failedCount:true}});
  if(existing){
   if(["QUEUED","FAILED","PARTIAL","SENDING"].includes(existing.status)){const processed=await processAutomatedCampaign(existing.id);return ApiResponse.success({campaign:existing,processed},"Birthday wish retry processed.");}
   return ApiResponse.success({campaign:existing},"Birthday wish was already sent today.");
  }
  const name=student.fullName?.trim()||"Student";
  const campaign=await queueAutomatedWhatsappAlert({schoolId:tenant.schoolId,automationKey:key,sourceType:"BIRTHDAY",sourceId:student.id,title:"Birthday wishes",message:`Happy Birthday, ${name}! 🎉 Wishing you a wonderful year filled with happiness, good health, learning and success. Best wishes from your school.`,studentIds:[student.id],targetLabel:`${name} — Birthday`});
  if(!campaign)return ApiResponse.error("Birthday wish could not be queued. Check WhatsApp automation and template configuration.",400);
  const processed=await processAutomatedCampaign(campaign.id);
  return ApiResponse.success({campaign,processed},"Birthday wish processed.");
 });
}
