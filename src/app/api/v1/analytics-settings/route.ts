import { getAnalyticsSettings, saveAnalyticsSettings } from "@/features/reports/analytics-settings";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

export async function GET() {
  return apiHandler(async () => {
    const actor = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    return ApiResponse.success(await getAnalyticsSettings(actor.schoolId));
  });
}

export async function PATCH(request: Request) {
  return apiHandler(async () => {
    const actor = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const setting = await saveAnalyticsSettings(actor.schoolId, await request.json());

    await recordAuditLog({
      actor,
      module: "SYSTEM",
      action: "UPDATE",
      entityType: "ANALYTICS_SETTING",
      summary: "Updated school analytics targets and alert thresholds.",
      metadata: setting,
    });

    return ApiResponse.success(setting, "Analytics settings saved.");
  });
}
