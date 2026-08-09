import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";
import { requireTenant } from "@/lib/auth";
import { validateBody } from "@/lib/validation";

import { homeworkSchema } from "@/features/homework/schemas/homework.schema";
import { homeworkService } from "@/features/homework/services/homework.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { searchParams } = new URL(req.url);

    const page = Number(
      searchParams.get("page") ?? 1
    );

    const pageSize = Number(
      searchParams.get("pageSize") ?? 25
    );

    const search =
      searchParams.get("search") ?? undefined;

    const homework =
      await homeworkService.list(
        tenant.schoolId,
        {
          page,
          pageSize,
          search,
        }
      );

    return ApiResponse.success(
      homework
    );
  });
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const body = await validateBody(
      req,
      homeworkSchema
    );

    const item =
      await homeworkService.create(
        tenant.schoolId,
        body
      );

    return ApiResponse.success(
      item,
      "Homework created successfully.",
      201
    );
  });
}