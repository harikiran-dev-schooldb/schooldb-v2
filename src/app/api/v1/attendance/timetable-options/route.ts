import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { timetableService } from "@/features/timetable/services/timetable.service";
import { WeekDay } from "@/generated/prisma/client";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { searchParams } = new URL(req.url);

    const academicYearId =
      searchParams.get("academicYearId") ?? "";

    const classId =
      searchParams.get("classId") ?? "";

    const sectionId =
      searchParams.get("sectionId") ?? "";

    const dayValue =
      searchParams.get("day") ?? "";

    if (
      !academicYearId ||
      !classId ||
      !sectionId ||
      !dayValue
    ) {
      throw new Error(
        "Academic year, class, section and day are required.",
      );
    }

    const day = dayValue as WeekDay;

    const data =
      await timetableService.classView(
        tenant.schoolId,
        academicYearId,
        classId,
        sectionId,
      );

    const filtered = data.filter(
      (item) => item.day === day,
    );

    return ApiResponse.success(filtered);
  });
}