import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";
import { requireTenant } from "@/lib/auth";

import { studentActivityService } from "@/features/students/services/student-activity.service";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _req: Request,
  { params }: Props,
) {
  return apiHandler(async () => {
    const { id } = await params;

    const tenant = await requireTenant();

    if (!tenant) {
      throw new Error("Unauthorized.");
    }

    const activities =
      await studentActivityService.list(
        id,
        tenant.schoolId,
      );

    return ApiResponse.success(activities);
  });
}