import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
const schema=z.discriminatedUnion("action",[z.object({action:z.literal("REQUIRE"),required:z.boolean()}).strict(),z.object({action:z.literal("REVIEW"),documentId:z.string().cuid(),status:z.enum(["PENDING","VERIFIED","REJECTED"]),note:z.string().trim().max(500)}).strict()]);
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 return apiHandler(async()=>{
  const actor=await requireRole(["SUPER_ADMIN","SCHOOL_ADMIN"]);
  if(!["SUPER_ADMIN","SCHOOL_ADMIN"].includes(actor.role))throw new ApiError(403,"Administrator required.");
  const {id}=await params;const input=schema.parse(await request.json());
  if(input.action==="REVIEW"&&input.status==="REJECTED"&&!input.note)throw new ApiError(400,"Enter the reason for rejection.");
  await prisma.$transaction(async tx=>{
   const application=await tx.admissionApplication.findFirst({where:{id,schoolId:actor.schoolId,status:{in:["DRAFT","SUBMITTED","UNDER_REVIEW","WAITLISTED"]}},select:{id:true,updatedAt:true}});
   if(!application)throw new ApiError(409,"Return the application to review before modifying verification.");
   await tx.admissionApplication.update({where:{id,schoolId:actor.schoolId,updatedAt:application.updatedAt},data:{...(input.action==="REQUIRE"?{documentReviewRequired:input.required}:{}),updatedAt:new Date()}});
   if(input.action==="REVIEW"){
    const changed=await tx.admissionDocument.updateMany({where:{id:input.documentId,applicationId:id,schoolId:actor.schoolId},data:{reviewStatus:input.status,reviewedAt:new Date(),reviewedBy:actor.userId,reviewNote:input.note||null}});
    if(changed.count!==1)throw new ApiError(404,"Document not found.");
   }
   await writeAuditLog(tx,{actor,module:"ADMISSIONS",action:"UPDATE",entityType:"ADMISSION_APPLICATION",entityId:id,summary:"Updated document verification.",metadata:input});
  },{isolationLevel:"Serializable"});
  return ApiResponse.success(null,"Document verification saved.");
 });
}
