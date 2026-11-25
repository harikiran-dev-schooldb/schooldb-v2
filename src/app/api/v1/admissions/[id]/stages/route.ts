import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { hasModuleAccess } from "@/lib/staff-permissions";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { writeAuditLog } from "@/lib/audit";
import { stageSchema } from "@/features/admissions/intake.schema";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    const actor = await requireRole(["SUPER_ADMIN","SCHOOL_ADMIN","RECEPTIONIST"]);
    if (!hasModuleAccess(actor, "ADMISSIONS", "MANAGE")) throw new ApiError(403, "Admissions management access required.");
    const { id } = await params;
    const input = await stageSchema.parseAsync(await request.json());
    if (input.status === "NOT_REQUIRED" && !["SUPER_ADMIN","SCHOOL_ADMIN"].includes(actor.role)) throw new ApiError(403, "Only an administrator may waive a stage.");
    await prisma.$transaction(async (tx) => {
      const application = await tx.admissionApplication.findFirst({ where: { id, schoolId: actor.schoolId, status: { in: ["DRAFT","SUBMITTED","UNDER_REVIEW","WAITLISTED"] } }, select: { id: true, status: true, updatedAt: true } });
      if (!application) throw new ApiError(409, "Application is unavailable for stage changes. Return approved applications to review first.");
      if (input.assignedMemberId && !await tx.membership.findFirst({ where: { id: input.assignedMemberId, schoolId: actor.schoolId, isActive: true, role: { in: ["SUPER_ADMIN","SCHOOL_ADMIN","RECEPTIONIST","TEACHER"] } }, select: { id: true } })) throw new ApiError(400, "Choose active staff in this school.");
      const when = input.status === "NOT_REQUIRED" ? null : input.scheduledAt ? new Date(input.scheduledAt) : null;
      const member = input.status === "NOT_REQUIRED" ? null : input.assignedMemberId;
      const data = input.stage === "ENTRANCE" ? { entranceStage: input.status, entranceAt: when, entranceMemberId: member } : { interviewStage: input.status, interviewAt: when, interviewMemberId: member };
      const changed = await tx.admissionApplication.updateMany({ where: { id, schoolId: actor.schoolId, status: application.status, updatedAt: application.updatedAt }, data });
      if (changed.count !== 1) throw new ApiError(409, "Application changed. Refresh and retry.");
      await writeAuditLog(tx, { actor, module: "ADMISSIONS", action: "UPDATE", entityType: "ADMISSION_APPLICATION", entityId: id, summary: "Updated " + input.stage.toLowerCase() + " stage to " + input.status, metadata: input });
    });
    return ApiResponse.success(null, "Stage saved.");
  });
}
