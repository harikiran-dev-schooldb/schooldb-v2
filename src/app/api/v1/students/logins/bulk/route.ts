import { studentLoginBulkService } from "@/features/students/services/student-login-bulk.service";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const result = await studentLoginBulkService.provision(
      tenant.schoolId,
      await request.json(),
    );

    await recordAuditLog({
      actor: tenant,
      module: "STUDENTS",
      action: "ENABLE",
      entityType: "STUDENT_LOGIN_BATCH",
      summary: `Created ${result.provisioned} student logins; ${result.alreadyReady} were already ready.`,
      metadata: {
        requested: result.requested,
        provisioned: result.provisioned,
        alreadyReady: result.alreadyReady,
        skipped: result.skipped,
        failed: result.failed,
        notFound: result.notFound,
      },
    });

    return ApiResponse.success(result, "Student login setup processed.");
  });
}
