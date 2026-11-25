import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { hasModuleAccess } from "@/lib/staff-permissions";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { writeAuditLog } from "@/lib/audit";
import { taskSchema } from "@/features/admissions/intake.schema";

export async function POST(request: Request) {
  return apiHandler(async () => {
    const actor = await requireRole(["SUPER_ADMIN","SCHOOL_ADMIN","RECEPTIONIST"]);
    if (!hasModuleAccess(actor, "ADMISSIONS", "MANAGE")) throw new ApiError(403, "Admissions management access required.");
    const input = await taskSchema.parseAsync(await request.json());
    await prisma.$transaction(async (tx) => {
      if (input.action === "CREATE") {
        const [member, target] = await Promise.all([
          tx.membership.findFirst({ where: { id: input.assignedMemberId, schoolId: actor.schoolId, isActive: true, role: { in: ["SUPER_ADMIN","SCHOOL_ADMIN","RECEPTIONIST"] } }, include: { user: true } }),
          input.target === "ENQUIRY" ? tx.admissionEnquiry.findFirst({ where: { id: input.targetId, schoolId: actor.schoolId, state: { not: "CLOSED" } }, select: { id: true } }) : tx.admissionApplication.findFirst({ where: { id: input.targetId, schoolId: actor.schoolId, status: { not: "CONVERTED" } }, select: { id: true } }),
        ]);
        if (!member || !target) throw new ApiError(400, "Choose a valid school staff member and admission record.");
        const task = await tx.admissionContactTask.create({ data: {
          schoolId: actor.schoolId, assignedMemberId: member.id, assignedName: [member.user.firstName,member.user.lastName].filter(Boolean).join(" ") || member.designation || "School staff",
          dueAt: new Date(input.dueAt), note: input.note, ...(input.target === "ENQUIRY" ? { enquiryId: target.id } : { applicationId: target.id }),
        } });
        await writeAuditLog(tx, { actor, module: "ADMISSIONS", action: "CREATE", entityType: "ADMISSION_CONTACT_TASK", entityId: task.id, summary: "Scheduled parent follow-up." });
      } else {
        const changed = await tx.admissionContactTask.updateMany({ where: { id: input.taskId, schoolId: actor.schoolId, completedAt: null, ...(!["SUPER_ADMIN","SCHOOL_ADMIN"].includes(actor.role) ? { assignedMemberId: actor.id } : {}) }, data: { completedAt: new Date(), outcome: input.outcome, completionNote: input.completionNote } });
        if (changed.count !== 1) throw new ApiError(404, "Open follow-up assigned to you was not found.");
        await writeAuditLog(tx, { actor, module: "ADMISSIONS", action: "UPDATE", entityType: "ADMISSION_CONTACT_TASK", entityId: input.taskId, summary: "Completed parent follow-up: " + input.outcome });
      }
    });
    return ApiResponse.success(null, "Follow-up saved.");
  });
}
