import { z } from "zod";

import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { classSubjectService } from "@/features/class-subjects/services/class-subject.service";

const bulkSchema = z.object({
  academicYearId: z.string().min(1),
  rows: z
    .array(
      z.object({
        className: z.string(),
        subjectName: z.string(),
        active: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(2000),
});

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    const body = await validateBody(request, bulkSchema);

    const result = await classSubjectService.bulkCreate(
      tenant.schoolId,
      body.academicYearId,
      body.rows,
    );

    return ApiResponse.success(result, "Class subjects imported successfully.");
  });
}
