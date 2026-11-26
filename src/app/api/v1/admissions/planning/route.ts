import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { writeAuditLog } from "@/lib/audit";
const amount=z.number().int().min(0).max(100000000);
const schema=z.object({yearId:z.string().cuid(),field:z.enum(["termFee","annualFees","seatCapacity"]),classId:z.string().cuid(),value:amount.nullable()}).strict();
const capacityToggle=z.object({yearId:z.string().cuid(),classId:z.string().cuid(),enforceCapacity:z.boolean()}).strict();
const toggle=z.object({yearId:z.string().cuid(),publicEnabled:z.boolean()}).strict();
export async function PATCH(request:Request) {
 return apiHandler(async()=>{
  const actor=await requireRole(["SUPER_ADMIN","SCHOOL_ADMIN"]);
  if(!["SUPER_ADMIN","SCHOOL_ADMIN"].includes(actor.role))throw new ApiError(403,"School administrator required.");
  const body=await request.json();
  const input=typeof body?.publicEnabled==="boolean"?toggle.parse(body):typeof body?.enforceCapacity==="boolean"?capacityToggle.parse(body):schema.parse(body);
  await prisma.$transaction(async tx=>{
   const year=await tx.academicYear.findFirst({where:{id:input.yearId,schoolId:actor.schoolId,admissionsEnabled:true},select:{id:true,admissionPlanning:true}});
   if(!year)throw new ApiError(404,"Academic year is not enabled for admissions.");
   if("publicEnabled" in input){
    await tx.academicYear.update({where:{id:year.id,schoolId:actor.schoolId},data:{admissionPublicEnquiriesEnabled:input.publicEnabled}});
   }else{
    if(!await tx.class.findFirst({where:{id:input.classId,schoolId:actor.schoolId,active:true},select:{id:true}}))throw new ApiError(400,"Class is not in this school.");
    const {readPlanning}=await import("@/features/admissions/planning-policy");
    const planning=readPlanning(year.admissionPlanning);
    const row={...planning[input.classId]};
    if("enforceCapacity" in input){
     if(input.enforceCapacity&&row.seatCapacity===undefined)throw new ApiError(400,"Set a class seat target before enforcing a limit.");
     if(input.enforceCapacity)row.enforceCapacity=true;else delete row.enforceCapacity;
    }else{
     if(input.field==="seatCapacity"&&input.value!==null&&input.value>100000)throw new ApiError(400,"Capacity exceeds the allowed limit.");
     if(input.value===null){delete row[input.field];if(input.field==="seatCapacity")delete row.enforceCapacity;}else row[input.field]=input.value;
    }
    planning[input.classId]=row;
    await tx.academicYear.update({where:{id:year.id,schoolId:actor.schoolId},data:{admissionPlanning:planning}});
   }
   await writeAuditLog(tx,{actor,module:"ADMISSIONS",action:"UPDATE",entityType:"ADMISSION_PLANNING",entityId:year.id,summary:"Updated admission planning configuration.",metadata:input});
  },{isolationLevel:"Serializable"});
  return ApiResponse.success(null,"Admission planning saved.");
 });
}
