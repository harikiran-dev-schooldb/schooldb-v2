import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { studentBulkService } from "@/features/students/services/student-bulk.service";

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = await req.json();

    const result = await studentBulkService.import(tenant.schoolId, body);

    return ApiResponse.success(result, "Bulk student import processed.");
  });
}
