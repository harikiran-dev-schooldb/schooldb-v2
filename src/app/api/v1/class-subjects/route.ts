import { z } from "zod";

import { apiHandler } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { classSubjectService } from "@/features/class-subjects/services/class-subject.service";

const classSubjectSchema = z.object({
  academicYearId: z.string().min(1),
  classId: z.string().min(1),
  subjectId: z.string().min(1),
});

export async function GET(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    const { searchParams } = new URL(request.url);
    const data = await classSubjectService.list(
      tenant.schoolId,
      searchParams.get("academicYearId") ?? undefined,
      searchParams.get("classId") ?? undefined,
    );
    return ApiResponse.success(data);
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = await validateBody(request, classSubjectSchema);
    const result = await classSubjectService.create(
      tenant.schoolId,
      body.academicYearId,
      body.classId,
      body.subjectId,
    );
    return ApiResponse.success(
      result,
      "Subject assigned to class successfully.",
      201,
    );
  });
}
