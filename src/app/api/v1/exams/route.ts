import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { examService } from "@/features/exams/services/exam.service";
import { createExamSchema } from "@/features/exams/schemas/exam.schema";

export async function GET() {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const exams = await examService.getAll(
      tenant.schoolId,
    );

    return ApiResponse.success(exams);
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const body = await request.json();

    const parsed =
      createExamSchema.safeParse(body);

    if (!parsed.success) {
      return ApiResponse.error(
        parsed.error.issues[0]?.message ||
          "Invalid exam data.",
        400,
      );
    }

    const exam = await examService.create(
      tenant.schoolId,
      {
        academicYearId:
          parsed.data.academicYearId,

        name:
          parsed.data.name,

        startDate:
          new Date(parsed.data.startDate),

        endDate:
          new Date(parsed.data.endDate),
      },
    );

    return ApiResponse.success(
      exam,
      "Exam created successfully.",
      201,
    );
  });
}