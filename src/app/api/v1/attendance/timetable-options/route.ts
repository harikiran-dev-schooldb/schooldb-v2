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

    const day =
      searchParams.get("day") as WeekDay;

    if (
      !academicYearId ||
      !classId ||
      !sectionId ||
      !day
    ) {
      throw new Error(
        "Academic year, class, section and day are required."
      );
    }

    const data =
      await timetableService.classView(
        tenant.schoolId,
        academicYearId,
        classId,
        sectionId
      );

    const result = data
      .filter((item) => item.day === day)
      .map((item) => ({
        id: item.id,
        periodId: item.periodId,
        periodName: item.period.name,
        day: item.day,
        subjectName:
          item.teacherAllocation.subject.name,
        teacherName:
          item.teacherAllocation.teacher.fullName,
      }));

    return ApiResponse.success(result);
  });
}