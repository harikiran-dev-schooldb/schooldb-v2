import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import {
  studentEnrollmentService,
  type PromotionDecision,
} from "@/features/student-enrollments/services/student-enrollment.service";

type PreviewBody = Record<string, unknown>;

function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }
  return value.trim();
}

function decision(value: unknown): PromotionDecision {
  if (value === "PROMOTE" || value === "DETAIN") return value;
  throw new Error("Choose Promote or Detain.");
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = (await request.json()) as PreviewBody;
    if (!Array.isArray(body.studentIds) || body.studentIds.length === 0) {
      throw new Error("Select at least one student.");
    }
    const studentIds = body.studentIds.filter(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    );
    if (studentIds.length !== body.studentIds.length) {
      throw new Error("Invalid student selection.");
    }

    const result = await studentEnrollmentService.previewPromotion(tenant.schoolId, {
      studentIds: [...new Set(studentIds)],
      sourceAcademicYearId: requiredString(body.sourceAcademicYearId, "Source academic year"),
      sourceClassId: requiredString(body.sourceClassId, "Source class"),
      sourceSectionId: requiredString(body.sourceSectionId, "Source section"),
      targetAcademicYearId: requiredString(body.targetAcademicYearId, "Target academic year"),
      targetClassId: requiredString(body.targetClassId, "Target class"),
      targetSectionId: requiredString(body.targetSectionId, "Target section"),
      decision: decision(body.decision),
    });

    return ApiResponse.success(result, "Promotion review prepared.");
  });
}
