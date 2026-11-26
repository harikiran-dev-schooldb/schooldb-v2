import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
export async function PATCH(request:Request){return apiHandler(async()=>{const actor=await requireRole(["SUPER_ADMIN","SCHOOL_ADMIN"]);if(!["SUPER_ADMIN","SCHOOL_ADMIN"].includes(actor.role))throw new ApiError(403,"Administrator required.");const {enabled}=z.object({enabled:z.boolean()}).strict().parse(await request.json());await prisma.$transaction(async tx=>{const s=await tx.schoolAdmissionSetting.upsert({where:{schoolId:actor.schoolId},create:{schoolId:actor.schoolId,admissionRemindersEnabled:enabled},update:{admissionRemindersEnabled:enabled}});await writeAuditLog(tx,{actor,module:"ADMISSIONS",action:"UPDATE",entityType:"ADMISSION_REMINDERS",entityId:s.id,summary:"Changed administrator admission reminders.",metadata:{enabled}});});return ApiResponse.success(null,"Reminder setting saved.");});}
