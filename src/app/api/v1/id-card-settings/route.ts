import { saveIdCardSetting } from "@/features/students/services/id-card-setting.service";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

export async function POST(request: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const result = await saveIdCardSetting(membership.schoolId, await request.json());
    return ApiResponse.success(result, "ID card design saved successfully.");
  });
}
