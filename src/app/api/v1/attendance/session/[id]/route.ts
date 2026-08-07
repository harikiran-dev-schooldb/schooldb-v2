import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { attendanceService } from "@/features/attendance/services/attendance.service";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  req: Request,
  { params }: Props
) {
  return apiHandler(async () => {
    const tenant =
      await requireTenant();

    const { id } = await params;

    const result =
      await attendanceService.getSession(
        tenant.schoolId,
        id
      );

    return ApiResponse.success(result);
  });
}