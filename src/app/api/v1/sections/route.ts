import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { sectionSchema } from "@/features/sections/schemas/section.schema";
import { sectionService } from "@/features/sections/services/section.service";
import { requireTenant } from "@/lib/auth";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 25);
    const search = searchParams.get("search") ?? undefined;

    const sections = await sectionService.list(
      tenant.schoolId,
      {
        page,
        pageSize,
        search,
      }
    );

    return ApiResponse.success(sections);
  });
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const body = await validateBody(
      req,
      sectionSchema
    );

    const section = await sectionService.create(
      tenant.schoolId,
      body
    );

    return ApiResponse.success(
      section,
      "Section created successfully.",
      201
    );
  });
}