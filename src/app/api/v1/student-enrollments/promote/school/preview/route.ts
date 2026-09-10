import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { studentEnrollmentService } from "@/features/student-enrollments/services/student-enrollment.service";

function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required.`);
  return value.trim();
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = (await request.json()) as Record<string, unknown>;
    const result = await studentEnrollmentService.previewSchoolPromotion(tenant.schoolId, {
      sourceAcademicYearId: requiredString(body.sourceAcademicYearId, "Source academic year"),
      targetAcademicYearId: requiredString(body.targetAcademicYearId, "Target academic year"),
    });
    return ApiResponse.success(result, "School-wide promotion review prepared.");
  });
}
