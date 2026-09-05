import { timetableSchema } from "@/features/timetable";
import { timetableService } from "@/features/timetable/services/timetable.service";
import { apiHandler } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page") ?? 1);

    const pageSize = Number(searchParams.get("pageSize") ?? 25);

    const search = searchParams.get("search") ?? undefined;

    const result = await timetableService.list(tenant.schoolId, {
      page,
      pageSize,
      search,
    });

    return ApiResponse.success(result);
  });
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);

    const body = await validateBody(req, timetableSchema);

    const timetable = await timetableService.create(tenant.schoolId, body);

    return ApiResponse.success(
      timetable,
      "Timetable created successfully.",
      201,
    );
  });
}
