import { apiHandler } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { periodSchema } from "@/features/periods/schemas/period.schema";
import { periodService } from "@/features/periods/services/period.service";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: Request, { params }: Props) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { id } = await params;

    const period = await periodService.get(id, tenant.schoolId);

    return ApiResponse.success(period);
  });
}

export async function PUT(req: Request, { params }: Props) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);

    const { id } = await params;

    const body = await validateBody(req, periodSchema);

    const period = await periodService.update(id, tenant.schoolId, body);

    return ApiResponse.success(period, "Period updated successfully.");
  });
}
