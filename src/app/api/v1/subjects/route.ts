import { apiHandler } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { subjectSchema } from "@/features/subjects/schemas/subject.schema";
import { subjectService } from "@/features/subjects/services/subject.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 25);
    const search = searchParams.get("search") ?? undefined;

    const tenant = await requireTenant();

    const data = await subjectService.list(tenant.schoolId, {
      page,
      pageSize,
      search,
    });

    return ApiResponse.success(data);
  });
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const body = await validateBody(req, subjectSchema);

    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);

    const subject = await subjectService.create(tenant.schoolId, body);

    return ApiResponse.success(subject, "Subject created successfully.", 201);
  });
}
