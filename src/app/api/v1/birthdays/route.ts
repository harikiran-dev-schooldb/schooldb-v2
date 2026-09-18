import { prisma } from "@/lib/prisma";
import { apiHandler, ApiResponse } from "@/lib/api";
import { requireRole } from "@/lib/tenant";

const ADMIN_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN"] as const;

function indiaParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { month:"numeric", day:"numeric", timeZone:"Asia/Kolkata" }).formatToParts(value);
  return { month:Number(parts.find(p=>p.type==="month")?.value), day:Number(parts.find(p=>p.type==="day")?.value) };
}

export async function GET() {
  return apiHandler(async () => {
    const tenant = await requireRole([...ADMIN_ROLES]);
    const today = indiaParts(new Date());
    const students = await prisma.student.findMany({
      where:{ schoolId:tenant.schoolId, status:"ACTIVE", enrollments:{some:{active:true}} },
      select:{
        id:true, admissionNo:true, fullName:true, dob:true, imageUrl:true, whatsappOptIn:true,
        enrollments:{where:{active:true},take:1,orderBy:{createdAt:"desc"},select:{class:{select:{name:true}},section:{select:{name:true}}}},
      },
      orderBy:{fullName:"asc"},
    });
    const birthdays=students.filter(s=>{const d=indiaParts(s.dob);return d.month===today.month&&d.day===today.day;});
    return ApiResponse.success({birthdays,total:birthdays.length});
  });
}
