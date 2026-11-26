import { saveAdmissionAgePolicySchema } from "@/features/admissions/age-policy.schema";
import { apiHandler } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

export async function PATCH(request: Request) {
  return apiHandler(async () => {
    const actor = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    if (!["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(actor.role)) throw new ApiError(403, "Only school administrators may change eligibility rules.");
    const { academicYearId, policy } = await saveAdmissionAgePolicySchema.parseAsync(await request.json());
    const classIds = Object.keys(policy.rules);
    const saved = await prisma.$transaction(async (tx) => {
      const year = await tx.academicYear.findFirst({ where: { id: academicYearId, schoolId: actor.schoolId, admissionsEnabled: true }, select: { id: true, admissionAgePolicy: true } });
      if (!year) throw new ApiError(404, "Academic year is not enabled for admissions.");
      const count = await tx.class.count({ where: { id: { in: classIds }, schoolId: actor.schoolId } });
      if (count !== classIds.length) throw new ApiError(400, "Every rule must reference a class in this school.");
      const updated = await tx.academicYear.updateMany({ where: { id: year.id, schoolId: actor.schoolId, admissionsEnabled: true }, data: { admissionAgePolicy: policy } });
      if (updated.count !== 1) throw new ApiError(409, "Academic year is no longer enabled for admissions.");
      await writeAuditLog(tx, { actor, module: "ADMISSIONS", action: "UPDATE", entityType: "ADMISSION_AGE_POLICY", entityId: year.id, summary: "Updated academic-year admission age eligibility rules.", metadata: { before: year.admissionAgePolicy, after: policy } });
      return policy;
    });
    return ApiResponse.success(saved, "Age eligibility rules saved.");
  });
}
