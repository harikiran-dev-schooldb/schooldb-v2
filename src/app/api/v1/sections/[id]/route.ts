import { NextRequest } from "next/server";

import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { sectionSchema } from "@/features/sections/schemas/section.schema";
import { sectionService } from "@/features/sections/services/section.service";
import { requireRole, requireTenant } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { id } = await params;

    const section = await sectionService.get(id, tenant.schoolId);

    return ApiResponse.success(section);
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);

    const { id } = await params;

    const body = await validateBody(req, sectionSchema);

    const section = await sectionService.update(id, tenant.schoolId, body);

    return ApiResponse.success(section, "Section updated successfully.");
  });
}
