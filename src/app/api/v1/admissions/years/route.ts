import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const schema=z.object({yearId:z.string().cuid(),enabled:z.boolean()}).strict();
export async function PATCH(request:Request) {
 return apiHandler(async()=>{
  const actor=await requireRole(["SUPER_ADMIN","SCHOOL_ADMIN"]);
  if(!["SUPER_ADMIN","SCHOOL_ADMIN"].includes(actor.role))throw new ApiError(403,"Administrator required.");
  const input=schema.parse(await request.json());
  await prisma.$transaction(async tx=>{
   const year=await tx.academicYear.findFirst({where:{id:input.yearId,schoolId:actor.schoolId},select:{id:true,admissionsEnabled:true}});
   if(!year)throw new ApiError(404,"Academic year not found.");
   await tx.academicYear.update({where:{id:year.id,schoolId:actor.schoolId},data:{admissionsEnabled:input.enabled,...(!input.enabled?{admissionPublicEnquiriesEnabled:false}:{})}});
   await writeAuditLog(tx,{actor,module:"ADMISSIONS",action:"UPDATE",entityType:"ADMISSION_YEAR",entityId:year.id,summary:"Changed admissions year availability.",metadata:{before:year.admissionsEnabled,after:input.enabled}});
  },{isolationLevel:"Serializable"});
  return ApiResponse.success(null,"Admissions year updated.");
 });
}
