import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

const ADMIN_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN"] as const;
const INDIA_TIME_ZONE = "Asia/Kolkata";

function indiaDateParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { year:"numeric", month:"numeric", day:"numeric", timeZone:INDIA_TIME_ZONE }).formatToParts(value);
  return {
    year:Number(parts.find(p=>p.type==="year")?.value),
    month:Number(parts.find(p=>p.type==="month")?.value),
    day:Number(parts.find(p=>p.type==="day")?.value),
  };
}

function monthDayKey(month:number,day:number){return month*100+day;}

export async function GET() {
  return apiHandler(async () => {
    const tenant = await requireRole([...ADMIN_ROLES]);
    const now = new Date();
    const today = indiaDateParts(now);
    const todayUtc = new Date(Date.UTC(today.year,today.month-1,today.day));
    const next7Utc = new Date(todayUtc); next7Utc.setUTCDate(next7Utc.getUTCDate()+7);

    const students = await prisma.student.findMany({
      where:{ schoolId:tenant.schoolId, status:"ACTIVE", enrollments:{some:{active:true}} },
      select:{
        id:true, admissionNo:true, fullName:true, dob:true, imageUrl:true, whatsappOptIn:true,
        enrollments:{where:{active:true},take:1,orderBy:{createdAt:"desc"},select:{class:{select:{name:true}},section:{select:{name:true}}}},
      },
      orderBy:{fullName:"asc"},
    });

    const todayDateKey=new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:INDIA_TIME_ZONE}).format(now);
    const campaigns=await prisma.whatsappCampaign.findMany({where:{schoolId:tenant.schoolId,sourceType:"BIRTHDAY",automationKey:{startsWith:"birthday:"}},select:{sourceId:true,automationKey:true,status:true,sentCount:true,deliveredCount:true,readCount:true,failedCount:true}});
    const campaignMap=new Map(campaigns.filter(c=>c.automationKey?.endsWith(`:${todayDateKey}`)).map(c=>[c.sourceId,c]));

    const enriched=students.map(student=>{
      const dob=indiaDateParts(student.dob);
      let occurrence=new Date(Date.UTC(today.year,dob.month-1,dob.day));
      if(occurrence<todayUtc) occurrence=new Date(Date.UTC(today.year+1,dob.month-1,dob.day));
      return {...student,birthdayMonth:dob.month,birthdayDay:dob.day,nextBirthday:occurrence.toISOString(),ageTurning:occurrence.getUTCFullYear()-dob.year,wishStatus:campaignMap.get(student.id)??null};
    });
    const todayKey=monthDayKey(today.month,today.day);
    const birthdays=enriched.filter(s=>monthDayKey(s.birthdayMonth,s.birthdayDay)===todayKey);
    const next7=enriched.filter(s=>{const d=new Date(s.nextBirthday);return d>todayUtc&&d<=next7Utc;}).sort((a,b)=>a.nextBirthday.localeCompare(b.nextBirthday));
    const thisMonth=enriched.filter(s=>s.birthdayMonth===today.month).sort((a,b)=>a.birthdayDay-b.birthdayDay);

    return ApiResponse.success({birthdays,next7,thisMonth,total:birthdays.length});
  });
}
