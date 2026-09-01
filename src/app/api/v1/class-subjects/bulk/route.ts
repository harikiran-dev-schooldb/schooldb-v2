import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { classSubjectService } from "@/features/class-subjects/services/class-subject.service";
import { bulkSchema } from "@/features/class-subjects/schema/class-subject-schema";



export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    const body = await validateBody(request, bulkSchema);

    const result = await classSubjectService.bulkCreate(
      tenant.schoolId,
      body.mappings,
    );

    return ApiResponse.success(
      result,
      "Class subjects imported successfully.",
    );
  });
}