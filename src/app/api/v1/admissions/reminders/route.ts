import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
export async function PATCH(request:Request){return apiHandler(async()=>{const actor=await requireRole(["SUPER_ADMIN","SCHOOL_ADMIN"]);if(!["SUPER_ADMIN","SCHOOL_ADMIN"].includes(actor.role))throw new ApiError(403,"Administrator required.");const input=z.object({enabled:z.boolean().optional(),eventAlertsEnabled:z.boolean().optional()}).strict().refine(x=>x.enabled!==undefined||x.eventAlertsEnabled!==undefined).parse(await request.json());const values={...(input.enabled!==undefined?{admissionRemindersEnabled:input.enabled}:{}),...(input.eventAlertsEnabled!==undefined?{admissionEventAlertsEnabled:input.eventAlertsEnabled}:{})};await prisma.$transaction(async tx=>{const s=await tx.schoolAdmissionSetting.upsert({where:{schoolId:actor.schoolId},create:{schoolId:actor.schoolId,...values},update:values});await writeAuditLog(tx,{actor,module:"ADMISSIONS",action:"UPDATE",entityType:"ADMISSION_REMINDERS",entityId:s.id,summary:"Changed administrator admission alerts.",metadata:values});});return ApiResponse.success(null,"Reminder setting saved.");});}
