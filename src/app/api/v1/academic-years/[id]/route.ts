import { NextRequest } from "next/server";

import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";
import { requireRole, requireTenant } from "@/lib/auth";
import { validateBody } from "@/lib/validation";

import { academicYearSchema } from "@/features/academic-years/schemas/academic-year.schema";
import { academicYearService } from "@/features/academic-years/services/academic-year.service";

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Props) {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    const { id } = await params;
    const year = await academicYearService.get(id, tenant.schoolId);
    return ApiResponse.success(year);
  });
}

export async function PUT(req: NextRequest, { params }: Props) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = await validateBody(req, academicYearSchema);
    const { id } = await params;
    const year = await academicYearService.update(id, tenant.schoolId, body);
    return ApiResponse.success(year, "Academic year updated successfully.");
  });
}
