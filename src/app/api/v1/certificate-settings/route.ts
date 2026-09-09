import { saveCertificateSetting } from "@/features/students/services/certificate-setting.service";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

export async function POST(request: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const result = await saveCertificateSetting(membership.schoolId, await request.json());
    return ApiResponse.success(result, "Certificate settings saved successfully.");
  });
}
