import { apiHandler } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { examScheduleService } from "@/features/exams/services/exam-schedule.service";

type Params = Promise<{
  examId: string;
  scheduleId: string;
}>;

export async function GET(
  _req: Request,
  { params }: { params: Params },
) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { examId, scheduleId } = await params;

    const schedule = await examScheduleService.getById(
      scheduleId,
      tenant.schoolId,
    );

    if (!schedule || schedule.exam.id !== examId) {
      return ApiResponse.error("Exam schedule not found.", 404);
    }

    return ApiResponse.success(schedule);
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Params },
) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);

    const { examId, scheduleId } = await params;

    const existing = await examScheduleService.getById(
      scheduleId,
      tenant.schoolId,
    );

    if (!existing || existing.exam.id !== examId) {
      return ApiResponse.error("Exam schedule not found.", 404);
    }

    const body = await req.json();

    const schedule = await examScheduleService.update(
      scheduleId,
      tenant.schoolId,
      {
        classId: body.classId,
        sectionId:
          body.sectionId !== undefined
            ? body.sectionId || null
            : undefined,
        subjectId: body.subjectId,
        examDate: body.examDate,
        startTime:
          body.startTime !== undefined
            ? body.startTime || null
            : undefined,
        endTime:
          body.endTime !== undefined
            ? body.endTime || null
            : undefined,
        maxMarks:
          body.maxMarks !== undefined
            ? Number(body.maxMarks)
            : undefined,
        passMarks:
          body.passMarks !== undefined
            ? body.passMarks === "" || body.passMarks === null
              ? null
              : Number(body.passMarks)
            : undefined,
      },
    );

    return ApiResponse.success(
      schedule,
      "Exam schedule updated successfully.",
    );
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Params },
) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);

    const { examId, scheduleId } = await params;

    const existing = await examScheduleService.getById(
      scheduleId,
      tenant.schoolId,
    );

    if (!existing || existing.exam.id !== examId) {
      return ApiResponse.error("Exam schedule not found.", 404);
    }

    await examScheduleService.remove(scheduleId, tenant.schoolId);

    return ApiResponse.success(
      null,
      "Exam schedule deleted successfully.",
    );
  });
}
