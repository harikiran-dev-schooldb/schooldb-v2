import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";
import { requireTenant } from "@/lib/auth";
import { validateBody } from "@/lib/validation";

import { classSchema } from "@/features/classes/schemas/class.schema";
import { classService } from "@/features/classes/services/class.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 25);
    const search = searchParams.get("search") ?? undefined;

    const classes = await classService.list(
      tenant.schoolId,
      {
        page,
        pageSize,
        search,
      }
    );

    return ApiResponse.success(classes);
  });
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const body = await validateBody(
      req,
      classSchema
    );

    const item = await classService.create(
      tenant.schoolId,
      body
    );

    return ApiResponse.success(
      item,
      "Class created successfully.",
      201
    );
  });
}