import { apiHandler } from "@/lib/api";
import { requireRole, requireTeacherFeatureAccess, teacherClassScope } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { outstandingFeesService } from "@/features/fees/services/outstanding-fees.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole([
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "ACCOUNTANT",
      "TEACHER",
    ]);
    const allowedClassSections =
      tenant.role === "TEACHER"
        ? await requireTeacherFeatureAccess("FEES").then(() => teacherClassScope(tenant.schoolId))
        : undefined;

    const { searchParams } =
      new URL(req.url);

    const search =
      searchParams.get("search")?.trim() ||
      undefined;

    const classId =
      searchParams.get("classId") ||
      undefined;

    const sectionId =
      searchParams.get("sectionId") ||
      undefined;

    const academicYearId =
      searchParams.get(
        "academicYearId",
      ) || undefined;

    const installmentName =
      searchParams.get("installmentName")?.trim() || undefined;

    const summaryOnly =
      searchParams.get("summary") === "1";

    const pageParam =
      Number(
        searchParams.get("page") || "1",
      );

    const pageSizeParam =
      Number(
        searchParams.get("pageSize") ||
          "25",
      );

    const page =
      Number.isFinite(pageParam) &&
      pageParam > 0
        ? Math.floor(pageParam)
        : 1;

    const pageSize =
      Number.isFinite(pageSizeParam) &&
      pageSizeParam > 0
        ? Math.min(
            Math.floor(pageSizeParam),
            100,
          )
        : 25;

    const result = summaryOnly
      ? await outstandingFeesService.summary({
          schoolId: tenant.schoolId,
          search,
          classId,
          sectionId,
          academicYearId,
          installmentName,
          allowedClassSections,
        })
      : await outstandingFeesService.list({
          schoolId: tenant.schoolId,
          search,
          classId,
          sectionId,
          academicYearId,
          installmentName,
          page,
          pageSize,
          allowedClassSections,
        });

    return ApiResponse.success(
      result,
    );
  });
}
