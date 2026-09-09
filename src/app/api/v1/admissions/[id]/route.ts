import { admissionStatusSchema } from "@/features/admissions/admission.schema";
import { changeAdmissionStatus } from "@/features/admissions/admission.service";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    const actor = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "RECEPTIONIST"]);
    const { id } = await params;
    const input = await admissionStatusSchema.parseAsync(await request.json());
    const changedBy = [actor.user.firstName, actor.user.lastName].filter(Boolean).join(" ") || actor.designation || "School staff";
    const application = await changeAdmissionStatus({ id, schoolId: actor.schoolId, status: input.status, note: input.note, changedBy });
    await recordAuditLog({ actor, module: "ADMISSIONS", action: "UPDATE", entityType: "ADMISSION_APPLICATION", entityId: application.id, summary: `Changed ${application.applicationNo} (${application.studentName}) to ${application.status.replaceAll("_", " ")}.` });
    return ApiResponse.success(application, "Application status updated.");
  });
}
