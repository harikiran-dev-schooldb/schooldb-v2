import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { requireSchoolSlug } from "@/lib/tenant-context";
import { consumeRateLimit, requestIp } from "@/lib/rate-limit";
import { validCalendarDate } from "@/features/admissions/age-policy";
const schema=z.object({yearId:z.string().cuid(),classId:z.string().cuid(),studentName:z.string().trim().min(2).max(255),parentName:z.string().trim().min(2).max(255),mobile:z.string().regex(/^\d{10}$/),dob:z.string().refine(validCalendarDate),consent:z.literal(true),website:z.string().max(0)}).strict();
export async function POST(request:Request,{params}:{params:Promise<{schoolSlug:string}>}){
 return apiHandler(async()=>{
  const slug=requireSchoolSlug((await params).schoolSlug);
  const limit=await consumeRateLimit("public-admission-enquiry",slug+":"+(requestIp(request)||"unknown"),5,60*60*1000);
  if(!limit.allowed)throw new ApiError(429,"Too many attempts. Try again later.");
  const input=schema.parse(await request.json());
  if(input.dob>new Date().toISOString().slice(0,10))throw new ApiError(400,"Birth date cannot be in the future.");
  await prisma.$transaction(async tx=>{
   const school=await tx.school.findUnique({where:{slug},select:{id:true}});
   if(!school)throw new ApiError(404,"School not found.");
   const [year,cls]=await Promise.all([tx.academicYear.findFirst({where:{id:input.yearId,schoolId:school.id,active:true,admissionPublicEnquiriesEnabled:true},select:{id:true}}),tx.class.findFirst({where:{id:input.classId,schoolId:school.id,active:true},select:{id:true}})]);
   if(!year||!cls)throw new ApiError(400,"Public enquiries are not available for this selection.");
   const duplicate=await tx.admissionEnquiry.findFirst({where:{schoolId:school.id,academicYearId:year.id,mobile:input.mobile,studentName:{equals:input.studentName,mode:"insensitive"},state:{in:["PENDING","OPEN","LINKED"]}}});
   if(!duplicate)await tx.admissionEnquiry.create({data:{schoolId:school.id,academicYearId:year.id,classId:cls.id,studentName:input.studentName,parentName:input.parentName,mobile:input.mobile,dob:new Date(input.dob+"T00:00:00Z"),source:"PARENT_PORTAL",state:"PENDING",consentAt:new Date()}});
  },{isolationLevel:"Serializable"});
  return ApiResponse.success(null,"Enquiry received for school review. This is not an admission confirmation.",201);
 });
}
