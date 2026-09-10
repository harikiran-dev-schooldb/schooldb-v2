import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
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
    const rows = rowsFrom(body.rows);
    const result = await studentEnrollmentService.importPromotions(tenant.schoolId, rows);

    await recordAuditLog({
      actor: tenant,
      module: "ACADEMICS",
      action: "IMPORT",
      entityType: "STUDENT_PROMOTION_IMPORT",
      summary: `Imported ${result.created} student promotion decisions; ${result.skipped} skipped.`,
      metadata: { created: result.created, skipped: result.skipped, rows: rows.length },
    });

    return ApiResponse.success(result, "Promotion batch imported.");
  });
}
