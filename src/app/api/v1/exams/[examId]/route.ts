import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { examService } from "@/features/exams/services/exam.service";
import { updateExamSchema } from "@/features/exams/schemas/exam.schema";

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
    const tenant = await requireTenant();

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

    const exam = await examService.update(
      examId,
      tenant.schoolId,
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
      },
    );

    if (!exam) {
      return ApiResponse.error(
        "Exam not found.",
        404,
      );
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
    const tenant = await requireTenant();

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

    return ApiResponse.success(
      exam,
      "Exam deleted successfully.",
    );
  });
}