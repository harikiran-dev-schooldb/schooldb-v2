import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { WeekDay } from "@/generated/prisma/client";

import { timetableService } from "@/features/timetable/services/timetable.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { searchParams } = new URL(req.url);

    const academicYearId =
      searchParams.get("academicYearId") ?? "";

    const day =
      (searchParams.get("day") as WeekDay) ??
      "MONDAY";

    const data =
      await timetableService.dailyView(
        tenant.schoolId,
        academicYearId,
        day
      );

    return ApiResponse.success(data);
  });
}