import { randomBytes } from "node:crypto";
import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { hasModuleAccess } from "@/lib/staff-permissions";
import { ApiError } from "@/lib/errors";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { validCalendarDate, assessAge } from "@/features/admissions/age-policy";
import { readAdmissionAgePolicy } from "@/features/admissions/age-policy.schema";

const schema=z.object({gender:z.enum(["MALE","FEMALE","OTHER"]),dob:z.string().refine(validCalendarDate),guardianRelation:z.string().trim().max(100).optional(),previousSchool:z.string().trim().max(255).optional()}).strict();
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
 return apiHandler(async()=>{
  const actor=await requireRole(["SUPER_ADMIN","SCHOOL_ADMIN","RECEPTIONIST"]);
  if(!hasModuleAccess(actor,"ADMISSIONS","MANAGE"))throw new ApiError(403,"Admissions management access required.");
  const {id}=await params;const input=schema.parse(await request.json());
  if(input.dob>new Date().toISOString().slice(0,10))throw new ApiError(400,"Date of birth cannot be in the future.");
  const result=await prisma.$transaction(async tx=>{
   const enquiry=await tx.admissionEnquiry.findFirst({where:{id,schoolId:actor.schoolId,state:"OPEN",applicationId:null,academicYear:{admissionsEnabled:true,schoolId:actor.schoolId},applyingClass:{active:true,schoolId:actor.schoolId}},include:{academicYear:{select:{admissionAgePolicy:true}}}});
   if(!enquiry)throw new ApiError(404,"Open enquiry in an enabled admissions year not found.");
   if(enquiry.dob&&enquiry.dob.toISOString().slice(0,10)!==input.dob)throw new ApiError(400,"Birth date differs from the enquiry. Verify the existing record first.");
   const policy=readAdmissionAgePolicy(enquiry.academicYear.admissionAgePolicy);
   if(enquiry.academicYear.admissionAgePolicy!==null&&!policy)throw new ApiError(503,"School age policy needs review.");
   const age=assessAge(input.dob,policy,enquiry.classId);
   if(age.status==="INELIGIBLE"||age.status==="INVALID_DATE")throw new ApiError(400,"Student does not meet the selected class age rule.");
   const dob=new Date(input.dob+"T00:00:00Z");
   const duplicate=await tx.admissionApplication.findFirst({where:{schoolId:actor.schoolId,academicYearId:enquiry.academicYearId,studentName:{equals:enquiry.studentName,mode:"insensitive"},dob,OR:[{fatherPhone:enquiry.mobile},{motherPhone:enquiry.mobile},{guardianPhone:enquiry.mobile}]},select:{applicationNo:true}});
   if(duplicate)throw new ApiError(409,"Matching application exists: "+duplicate.applicationNo+". Link it instead.");
   const application=await tx.admissionApplication.create({data:{schoolId:actor.schoolId,academicYearId:enquiry.academicYearId,applyingClassId:enquiry.classId,applicationNo:"APP-"+randomBytes(6).toString("hex").toUpperCase(),studentName:enquiry.studentName,gender:input.gender,dob,guardianName:enquiry.parentName,guardianPhone:enquiry.mobile,guardianRelation:input.guardianRelation||null,previousSchool:input.previousSchool||null,whatsappOptIn:false,status:"SUBMITTED",history:{create:{toStatus:"SUBMITTED",changedBy:[actor.user.firstName,actor.user.lastName].filter(Boolean).join(" ")||"School staff",note:"Created from existing admission enquiry."}}},select:{id:true,applicationNo:true}});
   const changed=await tx.admissionEnquiry.updateMany({where:{id,schoolId:actor.schoolId,state:"OPEN",applicationId:null},data:{state:"LINKED",applicationId:application.id,dob}});
   if(changed.count!==1)throw new ApiError(409,"Enquiry changed. Refresh and try again.");
   await writeAuditLog(tx,{actor,module:"ADMISSIONS",action:"CREATE",entityType:"ADMISSION_APPLICATION",entityId:application.id,summary:"Created application from enquiry.",metadata:{enquiryId:id}});
   return application;
  },{isolationLevel:"Serializable"});
  return ApiResponse.success(result,"Application "+result.applicationNo+" created.",201);
 });
}
