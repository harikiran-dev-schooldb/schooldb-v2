import { attendanceBulkService } from "@/features/attendance/services/attendance-bulk.service";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const result = await attendanceBulkService.import(tenant.schoolId, await request.json());

    await recordAuditLog({
      actor: tenant,
      module: "ATTENDANCE",
      action: "IMPORT",
      entityType: "ATTENDANCE_SESSION",
      summary: `Imported ${result.imported} absentee attendance rows; ${result.failed} failed.`,
      metadata: { imported: result.imported, failed: result.failed },
    });

    return ApiResponse.success(result, "Bulk attendance import processed.");
  });
}
