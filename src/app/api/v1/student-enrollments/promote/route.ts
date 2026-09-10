import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { recordAuditLog } from "@/lib/audit";
import { queueAutomatedWhatsappAlert } from "@/features/whatsapp/service";

import {
  studentEnrollmentService,
  type PromotionDecision,
} from "@/features/student-enrollments/services/student-enrollment.service";

type PromotionBody = {
  studentIds?: unknown;

  sourceAcademicYearId?: unknown;
  sourceClassId?: unknown;
  sourceSectionId?: unknown;

  targetAcademicYearId?: unknown;
  targetClassId?: unknown;
  targetSectionId?: unknown;
  decision?: unknown;
  sendWhatsapp?: unknown;
};

function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

function promotionDecision(value: unknown): PromotionDecision {
  if (value === "PROMOTE" || value === "DETAIN") return value;
  throw new Error("Choose Promote or Detain.");
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

    const decision = promotionDecision(body.decision);
    const result = await studentEnrollmentService.promote(tenant.schoolId, {
      studentIds: [...new Set(studentIds)],

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
      decision,
    });

    await recordAuditLog({
      actor: tenant,
      module: "ACADEMICS",
      action: "UPDATE",
      entityType: "STUDENT_PROMOTION_BATCH",
      summary: `${decision === "DETAIN" ? "Detained" : "Promoted"} ${result.created} student(s); ${result.skipped} skipped.`,
      metadata: {
        decision,
        studentIds,
        sourceAcademicYearId: body.sourceAcademicYearId as string,
        targetAcademicYearId: body.targetAcademicYearId as string,
        targetClassId: body.targetClassId as string,
        targetSectionId: body.targetSectionId as string,
      },
    });

    let notificationQueued = false;
    if (body.sendWhatsapp === true && result.students.length > 0) {
      const sourceId = [
        body.sourceAcademicYearId,
        body.sourceClassId,
        body.sourceSectionId,
        body.targetAcademicYearId,
        body.targetClassId,
        body.targetSectionId,
        decision,
      ].join(":");
      const campaign = await queueAutomatedWhatsappAlert({
        schoolId: tenant.schoolId,
        automationKey: `promotion:${sourceId}`,
        sourceType: "PROMOTION",
        sourceId,
        title: decision === "DETAIN" ? "Academic year update" : "Student promoted",
        message:
          decision === "DETAIN"
            ? `Academic update: the student will continue in ${result.students[0]?.className ?? "the same class"} for ${result.students[0]?.academicYearName ?? "the next academic year"}. Please contact the school office for details.`
            : `Academic update: the student is promoted to ${result.students[0]?.className ?? "the next class"} — ${result.students[0]?.sectionName ?? "assigned section"} for ${result.students[0]?.academicYearName ?? "the next academic year"}.`,
        studentIds: result.students.map((student) => student.studentId),
        targetLabel: `${result.students.length} student promotion update`,
      });
      notificationQueued = Boolean(campaign);
    }

    return ApiResponse.success(
      { ...result, notificationQueued },
      decision === "DETAIN" ? "Students detained successfully." : "Students promoted successfully.",
    );
  });
}
