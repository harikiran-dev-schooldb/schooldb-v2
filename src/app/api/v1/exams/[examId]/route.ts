import { apiHandler } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { NextResponse } from "next/server";

import { examService } from "@/features/exams/services/exam.service";
import { updateExamSchema } from "@/features/exams/schemas/exam.schema";
import { recordAuditLog } from "@/lib/audit";
import { notifyExamResultsPublished } from "@/features/notifications/events";

type RouteContext = {
  params: Promise<{
    examId: string;
  }>;
};

/* -------------------------------------------------------------------------- */
/* GET SINGLE EXAM                                                             */
/* -------------------------------------------------------------------------- */

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { examId } = await context.params;

    const exam = await examService.getById(
      examId,
      tenant.schoolId,
    );

    if (!exam) {
      return ApiResponse.error(
        "Exam not found.",
        404,
      );
    }

    return ApiResponse.success(exam);
  });
}

/* -------------------------------------------------------------------------- */
/* UPDATE EXAM                                                                 */
/* -------------------------------------------------------------------------- */

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);

    const { examId } = await context.params;

    const body = await request.json();

    const parsed =
      updateExamSchema.safeParse(body);

    if (!parsed.success) {
      return ApiResponse.error(
        parsed.error.issues[0]?.message ||
          "Invalid exam data.",
        400,
      );
    }

    const update = await examService.update(
      examId,
      tenant,
      {
        ...(parsed.data.name !== undefined && {
          name: parsed.data.name,
        }),

        ...(parsed.data.startDate !== undefined && {
          startDate: new Date(
            parsed.data.startDate,
          ),
        }),

        ...(parsed.data.endDate !== undefined && {
          endDate: new Date(
            parsed.data.endDate,
          ),
        }),

        ...(parsed.data.status !== undefined && {
          status: parsed.data.status,
        }),

        ...(parsed.data.annualWeight !== undefined && {
          annualWeight: parsed.data.annualWeight,
        }),

        publishOverride: parsed.data.publishOverride,
        correctionReason: parsed.data.correctionReason,
      },
    );

    if (update.kind === "not-found") {
      return ApiResponse.error(
        "Exam not found.",
        404,
      );
    }

    if (update.kind === "checklist") {
      return NextResponse.json({
        success: false,
        message: update.canOverride
          ? "Review the current checklist before publishing incomplete results."
          : "A school administrator must approve publishing incomplete results.",
        checklist: update.checklist,
      }, { status: 409 });
    }

    const { exam } = update;

    if (parsed.data.status === "COMPLETED") {
      await notifyExamResultsPublished(exam.id, tenant.schoolId, tenant.userId);
    }

    if (!update.published && parsed.data.status !== "COMPLETED" && !parsed.data.correctionReason) {
      await recordAuditLog({
        actor: tenant,
        module: "ACADEMICS",
        action: "UPDATE",
        entityType: "EXAM",
        entityId: exam.id,
        summary: `Updated exam: ${exam.name}.`,
      });
    }

    return ApiResponse.success(
      exam,
      "Exam updated successfully.",
    );
  });
}

/* -------------------------------------------------------------------------- */
/* DELETE EXAM                                                                 */
/* -------------------------------------------------------------------------- */

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);

    const { examId } = await context.params;

    const exam = await examService.delete(
      examId,
      tenant.schoolId,
    );

    if (!exam) {
      return ApiResponse.error(
        "Exam not found.",
        404,
      );
    }

    await recordAuditLog({
      actor: tenant,
      module: "ACADEMICS",
      action: "DELETE",
      entityType: "EXAM",
      entityId: examId,
      summary: `Deleted exam: ${exam.name}.`,
    });

    return ApiResponse.success(
      exam,
      "Exam deleted successfully.",
    );
  });
}
