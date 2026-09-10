import { attendanceService } from "@/features/attendance/services/attendance.service";
import { apiHandler } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/access-control";
import { ApiResponse } from "@/lib/response";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const tenant = await requirePermission(PERMISSIONS.ATTENDANCE_READ);
    const searchParams = new URL(request.url).searchParams;
    const academicYearId = searchParams.get("academicYearId")?.trim();
    const classId = searchParams.get("classId")?.trim();
    const sectionId = searchParams.get("sectionId")?.trim() || undefined;
    const fromDate = searchParams.get("fromDate")?.trim() || undefined;
    const toDate = searchParams.get("toDate")?.trim() || undefined;
    const limit = Number(searchParams.get("limit") ?? 10);

    if (!academicYearId) {
      return ApiResponse.error("Academic year is required.", 400);
    }

    if (!classId) {
      return ApiResponse.error("Class is required.", 400);
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return ApiResponse.error("Top count must be between 1 and 100.", 400);
    }

    if (fromDate && toDate && fromDate > toDate) {
      return ApiResponse.error("From date cannot be after to date.", 400);
    }

    const data = await attendanceService.attendanceToppers(
      tenant.schoolId,
      academicYearId,
      classId,
      { sectionId, fromDate, toDate, limit },
    );

    return ApiResponse.success(data);
  });
}
