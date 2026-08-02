import { NextRequest } from "next/server";

import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";
import { requireTenant } from "@/lib/auth";
import { validateBody } from "@/lib/validation";

import { classSchema } from "@/features/classes/schemas/class.schema";
import { classService } from "@/features/classes/services/class.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { id } = await params;

    const item = await classService.get(
      id,
      tenant.schoolId
    );

    return ApiResponse.success(item);
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { id } = await params;

    const body = await validateBody(
      req,
      classSchema
    );

    const item = await classService.update(
      id,
      tenant.schoolId,
      body
    );

    return ApiResponse.success(
      item,
      "Class updated successfully."
    );
  });
}