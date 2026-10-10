import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
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
    const sourceAcademicYearId = requiredString(body.sourceAcademicYearId, "Source academic year");
    const targetAcademicYearId = requiredString(body.targetAcademicYearId, "Target academic year");
    const graduateFinalClass = body.graduateFinalClass === true;
    const result = await studentEnrollmentService.promoteSchool(tenant.schoolId, {
      sourceAcademicYearId,
      targetAcademicYearId,
      graduateFinalClass,
    }, tenant.userId);

    await recordAuditLog({
      actor: tenant,
      module: "ACADEMICS",
      action: "UPDATE",
      entityType: "SCHOOL_PROMOTION_BATCH",
      summary: `Promoted ${result.created} students and graduated ${result.graduatedStudents} final-class students school-wide; ${result.skipped} existing enrollments skipped.`,
      metadata: {
        sourceAcademicYearId,
        targetAcademicYearId,
        graduateFinalClass,
        created: result.created,
        skipped: result.skipped,
        graduatingStudents: result.graduatingStudents,
        graduatedStudents: result.graduatedStudents,
        graduationSkipped: result.graduationSkipped,
        unmappedStudents: result.unmappedStudents,
      },
    });

    return ApiResponse.success(result, "School-wide promotion completed.");
  });
}
