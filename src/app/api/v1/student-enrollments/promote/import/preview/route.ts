import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import {
  studentEnrollmentService,
  type PromotionDecision,
  type PromotionImportRow,
} from "@/features/student-enrollments/services/student-enrollment.service";

function rowsFrom(value: unknown): PromotionImportRow[] {
  if (!Array.isArray(value)) throw new Error("Promotion rows are required.");
  return value.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      admissionNo: String(row.admissionNo ?? "").trim(),
      targetAcademicYear: String(row.targetAcademicYear ?? "").trim(),
      targetClass: String(row.targetClass ?? "").trim(),
      targetSection: String(row.targetSection ?? "").trim(),
      decision: String(row.decision ?? "").trim().toUpperCase() as PromotionDecision,
    };
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = (await request.json()) as Record<string, unknown>;
    const result = await studentEnrollmentService.previewPromotionImport(
      tenant.schoolId,
      rowsFrom(body.rows),
    );
    return ApiResponse.success(result, "Promotion file reviewed.");
  });
}
