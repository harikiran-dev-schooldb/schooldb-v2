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
import { undertakingInputSchema, ageExceptionAllowed } from "@/features/admissions/undertaking-policy";
import { readAdmissionAgePolicy } from "@/features/admissions/age-policy.schema";

const schema=z.object({gender:z.enum(["MALE","FEMALE","OTHER"]),dob:z.string().refine(validCalendarDate),guardianRelation:z.string().trim().max(100).optional(),previousSchool:z.string().trim().max(255).optional(),undertaking:undertakingInputSchema.optional()}).strict();
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
 return apiHandler(async()=>{
  const actor=await requireRole(["SUPER_ADMIN","SCHOOL_ADMIN","RECEPTIONIST"]);
  if(!hasModuleAccess(actor,"ADMISSIONS","MANAGE"))throw new ApiError(403,"Admissions management access required.");
  const {id}=await params;const input=schema.parse(await request.json());
  if(input.dob>new Date().toISOString().slice(0,10))throw new ApiError(400,"Date of birth cannot be in the future.");
  const result=await prisma.$transaction(async tx=>{
   const enquiry=await tx.admissionEnquiry.findFirst({where:{id,schoolId:actor.schoolId,state:"OPEN",applicationId:null,academicYear:{admissionsEnabled:true,schoolId:actor.schoolId},applyingClass:{active:true,schoolId:actor.schoolId}},include:{academicYear:{select:{admissionAgePolicy:true}},applyingClass:{select:{name:true}}}});
   if(!enquiry)throw new ApiError(404,"Open enquiry in an enabled admissions year not found.");
   if(enquiry.dob&&enquiry.dob.toISOString().slice(0,10)!==input.dob)throw new ApiError(400,"Birth date differs from the enquiry. Verify the existing record first.");
   const policy=readAdmissionAgePolicy(enquiry.academicYear.admissionAgePolicy);
   if(enquiry.academicYear.admissionAgePolicy!==null&&!policy)throw new ApiError(503,"School age policy needs review.");
   const age=assessAge(input.dob,policy,enquiry.classId);
   if(age.status==="INVALID_DATE")throw new ApiError(400,"Invalid date of birth or age cutoff cannot be overridden.");
   const admin=["SUPER_ADMIN","SCHOOL_ADMIN"].includes(actor.role);
   const approvedByName=[actor.user.firstName,actor.user.lastName].filter(Boolean).join(" ")||actor.designation||"School administrator";
   if(input.undertaking&&age.status!=="INELIGIBLE")throw new ApiError(400,"An undertaking is only needed for an actual age-rule mismatch.");
   let ageUndertaking;
   if(age.status==="INELIGIBLE"){
    if(!ageExceptionAllowed(age.status,admin,Boolean(input.undertaking?.confirmed))||!input.undertaking)throw new ApiError(400,"Age-rule mismatch. A school administrator must record the signed parent undertaking.");
    if(input.undertaking.signedDate>new Date().toISOString().slice(0,10))throw new ApiError(400,"Undertaking date cannot be in the future.");
    const rule=policy?.rules[enquiry.classId];
    if(!policy||!rule||age.months===null)throw new ApiError(400,"Age-rule configuration is invalid.");
    const eligible=await tx.class.findMany({where:{schoolId:actor.schoolId,active:true,id:{in:Object.keys(policy.rules).filter(id=>assessAge(input.dob,policy,id).status==="ELIGIBLE")}},select:{name:true}});
    ageUndertaking={...input.undertaking,recordedAt:new Date().toISOString(),approvedByUserId:actor.userId,approvedByName,appliedClassId:enquiry.classId,appliedClassName:enquiry.applyingClass.name,academicYearId:enquiry.academicYearId,dob:input.dob,cutoff:policy.ageAsOfDate,completedMonths:age.months,minMonths:rule.minMonths,maxMonths:rule.maxMonths,eligibleClasses:eligible.map(c=>c.name)};
   }
   const dob=new Date(input.dob+"T00:00:00Z");
   const duplicate=await tx.admissionApplication.findFirst({where:{schoolId:actor.schoolId,academicYearId:enquiry.academicYearId,studentName:{equals:enquiry.studentName,mode:"insensitive"},dob,OR:[{fatherPhone:enquiry.mobile},{motherPhone:enquiry.mobile},{guardianPhone:enquiry.mobile}]},select:{applicationNo:true}});
   if(duplicate)throw new ApiError(409,"Matching application exists: "+duplicate.applicationNo+". Link it instead.");
   const application=await tx.admissionApplication.create({data:{schoolId:actor.schoolId,academicYearId:enquiry.academicYearId,applyingClassId:enquiry.classId,applicationNo:"APP-"+randomBytes(6).toString("hex").toUpperCase(),studentName:enquiry.studentName,gender:input.gender,dob,guardianName:enquiry.parentName,guardianPhone:enquiry.mobile,guardianRelation:input.guardianRelation||null,previousSchool:input.previousSchool||null,whatsappOptIn:false,...(ageUndertaking?{ageUndertaking}:{}),status:"SUBMITTED",history:{create:{toStatus:"SUBMITTED",changedBy:[actor.user.firstName,actor.user.lastName].filter(Boolean).join(" ")||"School staff",note:ageUndertaking?"Created from enquiry with administrator-recorded signed parent age undertaking.":"Created from existing admission enquiry."}}},select:{id:true,applicationNo:true}});
   const changed=await tx.admissionEnquiry.updateMany({where:{id,schoolId:actor.schoolId,state:"OPEN",applicationId:null},data:{state:"LINKED",applicationId:application.id,dob}});
   if(changed.count!==1)throw new ApiError(409,"Enquiry changed. Refresh and try again.");
   await writeAuditLog(tx,{actor,module:"ADMISSIONS",action:"CREATE",entityType:"ADMISSION_APPLICATION",entityId:application.id,summary:ageUndertaking?"Created application with parent age undertaking.":"Created application from enquiry.",metadata:{enquiryId:id,...(ageUndertaking?{ageUndertaking}:{})}});
   return application;
  },{isolationLevel:"Serializable"});
  return ApiResponse.success(result,"Application "+result.applicationNo+" created.",201);
 });
}
