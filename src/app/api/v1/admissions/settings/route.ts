import { admissionSettingSchema } from "@/features/admissions/admission.schema";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

export async function GET() {
  return apiHandler(async () => {
    const actor = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const setting = await prisma.schoolAdmissionSetting.upsert({ where: { schoolId: actor.schoolId }, create: { schoolId: actor.schoolId }, update: {} });
    return ApiResponse.success(setting);
  });
}

export async function PATCH(request: Request) {
  return apiHandler(async () => {
    const actor = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const input = await admissionSettingSchema.parseAsync(await request.json());
    const setting = await prisma.schoolAdmissionSetting.upsert({ where: { schoolId: actor.schoolId }, create: { schoolId: actor.schoolId, ...input }, update: input });
    await recordAuditLog({ actor, module: "ADMISSIONS", action: "UPDATE", entityType: "ADMISSION_SETTING", entityId: setting.id, summary: `Updated admission numbering (${setting.automaticNumbering ? "automatic" : "manual"}).` });
    return ApiResponse.success(setting, "Admission numbering saved.");
  });
}
