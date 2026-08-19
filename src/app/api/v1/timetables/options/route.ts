import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { timetableService } from "@/features/timetable/services/timetable.service";

export async function GET() {
  return apiHandler(async () => {
    const tenant =
      await requireTenant();

    const options =
      await timetableService.options(
        tenant.schoolId
      );

    return ApiResponse.success(
      options
    );
  });
}