import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { studentEnrollmentService } from "@/features/student-enrollments/services/student-enrollment.service";

type PromotionBody = {
  studentIds?: unknown;

  sourceAcademicYearId?: unknown;
  sourceClassId?: unknown;
  sourceSectionId?: unknown;

  targetAcademicYearId?: unknown;
  targetClassId?: unknown;
  targetSectionId?: unknown;
};

function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);

    const body = (await request.json()) as PromotionBody;

    if (!Array.isArray(body.studentIds) || body.studentIds.length === 0) {
      throw new Error("Select at least one student to promote.");
    }

    const studentIds = body.studentIds.filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );

    if (studentIds.length !== body.studentIds.length) {
      throw new Error("Invalid student selection.");
    }

    const result = await studentEnrollmentService.promote(tenant.schoolId, {
      studentIds,

      sourceAcademicYearId: requiredString(
        body.sourceAcademicYearId,
        "Source academic year",
      ),

      sourceClassId: requiredString(body.sourceClassId, "Source class"),

      sourceSectionId: requiredString(body.sourceSectionId, "Source section"),

      targetAcademicYearId: requiredString(
        body.targetAcademicYearId,
        "Target academic year",
      ),

      targetClassId: requiredString(body.targetClassId, "Target class"),

      targetSectionId: requiredString(body.targetSectionId, "Target section"),
    });

    return ApiResponse.success(result, "Students promoted successfully.");
  });
}
