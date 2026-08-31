import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { outstandingFeesService } from "@/features/fees/services/outstanding-fees.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant =
      await requireTenant();

    const { searchParams } =
      new URL(req.url);

    const search =
      searchParams.get("search")?.trim() ||
      undefined;

    const classId =
      searchParams.get("classId") ||
      undefined;

    const academicYearId =
      searchParams.get(
        "academicYearId",
      ) || undefined;

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

    const result =
      await outstandingFeesService.list({
        schoolId:
          tenant.schoolId,

        search,
        classId,
        academicYearId,

        page,
        pageSize,
      });

    return ApiResponse.success(
      result,
    );
  });
}