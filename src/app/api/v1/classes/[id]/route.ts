import { NextRequest } from "next/server";

import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";
import { requireRole, requireTenant } from "@/lib/auth";

import { classSchema } from "@/features/classes/schemas/class.schema";
import { classService } from "@/features/classes/services/class.service";

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Props) {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    const { id } = await params;
    const item = await classService.get(id, tenant.schoolId);
    return ApiResponse.success(item);
  });
}

export async function PUT(req: NextRequest, { params }: Props) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const { id } = await params;
    const body = classSchema.parse(await req.json());
    const item = await classService.update(id, tenant.schoolId, body);
    return ApiResponse.success(item, "Class updated successfully.");
  });
}