import { StudentExamStatus } from "@/generated/prisma/client";

import { apiHandler } from "@/lib/api";
import { requireTeacherExamSchedule } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { studentExamMarkService } from "@/features/exams/services/student-exam-mark.service";

type Params = Promise<{
  scheduleId: string;
}>;

export async function GET(
  req: Request,
  { params }: { params: Params },
) {
  return apiHandler(async () => {
    const { scheduleId } = await params;
    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get("sectionId");

    if (!sectionId) {
      return ApiResponse.error(
        "Section is required for marks entry.",
        400,
      );
    }

    const tenant = await requireTeacherExamSchedule(
      scheduleId,
      sectionId,
    );

    const data = await studentExamMarkService.listForSchedule(
      scheduleId,
      tenant.schoolId,
      sectionId,
    );

    return ApiResponse.success(data);
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Params },
) {
  return apiHandler(async () => {
    const { scheduleId } = await params;
    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get("sectionId");

    if (!sectionId) {
      return ApiResponse.error(
        "Section is required for saving marks.",
        400,
      );
    }

    const tenant = await requireTeacherExamSchedule(
      scheduleId,
      sectionId,
    );

    const body = await req.json();

    if (!Array.isArray(body.marks)) {
      return ApiResponse.error(
        "Marks must be provided as an array.",
        400,
      );
    }

    if (body.marks.length === 0) {
      return ApiResponse.error(
        "At least one student mark is required.",
        400,
      );
    }

    const allowedStatuses = Object.values(StudentExamStatus);

    for (const mark of body.marks) {
      if (!mark.studentEnrollmentId) {
        return ApiResponse.error(
          "Student enrollment ID is required.",
          400,
        );
      }

      if (
        mark.status !== undefined &&
        !allowedStatuses.includes(mark.status)
      ) {
        return ApiResponse.error(
          `Invalid student exam status: ${mark.status}`,
          400,
        );
      }

      if (
        mark.marksObtained !== undefined &&
        mark.marksObtained !== null &&
        mark.marksObtained !== ""
      ) {
        const parsedMarks = Number(mark.marksObtained);

        if (!Number.isFinite(parsedMarks)) {
          return ApiResponse.error(
            "Marks obtained must be a valid number.",
            400,
          );
        }

        if (parsedMarks < 0) {
          return ApiResponse.error(
            "Marks obtained cannot be less than zero.",
            400,
          );
        }
      }
    }

    const result = await studentExamMarkService.saveBulk(
      scheduleId,
      tenant.schoolId,
      sectionId,
      body.marks.map(
        (mark: {
          studentEnrollmentId: string;
          marksObtained?: number | string | null;
          status?: StudentExamStatus;
          remarks?: string | null;
        }) => ({
          studentEnrollmentId: mark.studentEnrollmentId,
          marksObtained:
            mark.marksObtained !== undefined &&
            mark.marksObtained !== null &&
            mark.marksObtained !== ""
              ? Number(mark.marksObtained)
              : null,
          status: mark.status ?? StudentExamStatus.PRESENT,
          remarks: mark.remarks || null,
        }),
      ),
    );

    return ApiResponse.success(
      result,
      "Student marks saved successfully.",
    );
  });
}
