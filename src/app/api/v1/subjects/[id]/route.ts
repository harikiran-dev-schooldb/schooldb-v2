import { apiHandler } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { subjectSchema } from "@/features/subjects/schemas/subject.schema";
import { subjectService } from "@/features/subjects/services/subject.service";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: Request, { params }: Props) {
  return apiHandler(async () => {
    const { id } = await params;

    const tenant = await requireTenant();

    const subject = await subjectService.get(id, tenant.schoolId);

    return ApiResponse.success(subject);
  });
}

export async function PUT(req: Request, { params }: Props) {
  return apiHandler(async () => {
    const { id } = await params;

    const body = await validateBody(req, subjectSchema);

    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);

    const subject = await subjectService.update(id, tenant.schoolId, body);

    return ApiResponse.success(subject, "Subject updated successfully.");
  });
}
