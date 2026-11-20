import { saveGradingPolicy, getGradingPolicy } from "@/features/exams/grading-policy";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

export async function GET() {
  return apiHandler(async () => {
    const actor = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    return ApiResponse.success(await getGradingPolicy(actor.schoolId));
  });
}

export async function PATCH(request: Request) {
  return apiHandler(async () => {
    const actor = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const policy = await saveGradingPolicy(actor.schoolId, await request.json());
    await recordAuditLog({
      actor,
      module: "ACADEMICS",
      action: "UPDATE",
      entityType: "GRADING_POLICY",
      summary: "Updated annual grading and pass policy.",
      metadata: policy,
    });
    return ApiResponse.success(policy, "Grading policy saved.");
  });
}
