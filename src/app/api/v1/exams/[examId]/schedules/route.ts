import { apiHandler } from "@/lib/api";
import { requireCurrentTeacher, requireRole, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { examScheduleService } from "@/features/exams/services/exam-schedule.service";
import { prisma } from "@/lib/prisma";

type Params = Promise<{
  examId: string;
}>;

export async function GET(
  _req: Request,
  { params }: { params: Params },
) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { examId } = await params;

    let schedules = await examScheduleService.list(
      examId,
      tenant.schoolId,
    );

    if (tenant.role === "TEACHER") {
      const teacher = await requireCurrentTeacher(tenant.schoolId);
      const allocations = await prisma.teacherAllocation.findMany({
        where: { schoolId: tenant.schoolId, teacherId: teacher.id, active: true },
        select: { academicYearId: true, classId: true, sectionId: true, subjectId: true },
      });
      schedules = schedules.filter((schedule) =>
        allocations.some((allocation) =>
          allocation.classId === schedule.classId &&
          allocation.subjectId === schedule.subjectId &&
          (!schedule.sectionId || allocation.sectionId === schedule.sectionId),
        ),
      );
    }

    return ApiResponse.success(schedules);
  });
}

export async function POST(
  req: Request,
  { params }: { params: Params },
) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);

    const { examId } = await params;

    const body = await req.json();

    if (
      !body.classId ||
      !body.subjectId ||
      !body.examDate ||
      body.maxMarks === undefined ||
      body.maxMarks === null ||
      body.maxMarks === ""
    ) {
      return ApiResponse.error(
        "Class, subject, exam date and maximum marks are required.",
        400,
      );
    }

    if (Number(body.maxMarks) <= 0) {
      return ApiResponse.error(
        "Maximum marks must be greater than zero.",
        400,
      );
    }

    if (
      body.passMarks !== undefined &&
      body.passMarks !== null &&
      body.passMarks !== "" &&
      (Number(body.passMarks) < 0 ||
        Number(body.passMarks) > Number(body.maxMarks))
    ) {
      return ApiResponse.error(
        "Pass marks must be between 0 and maximum marks.",
        400,
      );
    }

    const schedule = await examScheduleService.create(
      tenant.schoolId,
      {
        examId,
        classId: body.classId,
        sectionId: body.sectionId || null,
        subjectId: body.subjectId,
        examDate: body.examDate,
        startTime: body.startTime || null,
        endTime: body.endTime || null,
        maxMarks: Number(body.maxMarks),
        passMarks:
          body.passMarks !== undefined &&
          body.passMarks !== null &&
          body.passMarks !== ""
            ? Number(body.passMarks)
            : null,
      },
    );

    return ApiResponse.success(
      schedule,
      "Exam schedule created successfully.",
      201,
    );
  });
}
