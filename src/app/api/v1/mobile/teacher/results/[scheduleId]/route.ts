import { StudentExamStatus } from "@/generated/prisma/client";
import { studentExamMarkService } from "@/features/exams/services/student-exam-mark.service";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { requireTeacherExamSchedule } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

type Params = Promise<{ scheduleId: string }>;

function sectionIdFrom(req: Request) {
  return new URL(req.url).searchParams.get("sectionId");
}

export async function GET(req: Request, { params }: { params: Params }) {
  return apiHandler(async () => {
    const { scheduleId } = await params;
    const sectionId = sectionIdFrom(req);
    if (!sectionId) return ApiResponse.error("Section is required.", 400);

    const tenant = await requireTeacherExamSchedule(scheduleId, sectionId);
    const data = await studentExamMarkService.listForSchedule(
      scheduleId,
      tenant.schoolId,
      sectionId,
    );
    return ApiResponse.success(data);
  });
}

export async function PUT(req: Request, { params }: { params: Params }) {
  return apiHandler(async () => {
    const { scheduleId } = await params;
    const sectionId = sectionIdFrom(req);
    if (!sectionId) return ApiResponse.error("Section is required.", 400);

    const tenant = await requireTeacherExamSchedule(scheduleId, sectionId);
    const schedule = await prisma.examSchedule.findFirst({
      where: { id: scheduleId, schoolId: tenant.schoolId },
      select: { exam: { select: { status: true } } },
    });
    if (!schedule) return ApiResponse.error("Exam schedule not found.", 404);
    if (["COMPLETED", "CANCELLED"].includes(schedule.exam.status)) {
      return ApiResponse.error("Marks for this exam are read-only.", 400);
    }

    const body = (await req.json()) as { marks?: unknown };
    if (!Array.isArray(body.marks) || body.marks.length === 0) {
      return ApiResponse.error("At least one student mark is required.", 400);
    }

    const allowedStatuses = Object.values(StudentExamStatus);
    const marks = body.marks.map((entry) => {
      const mark = entry as {
        studentEnrollmentId?: unknown;
        marksObtained?: unknown;
        status?: unknown;
        remarks?: unknown;
      };
      if (typeof mark.studentEnrollmentId !== "string" || !mark.studentEnrollmentId) {
        throw new Error("Student enrollment ID is required.");
      }
      const status = mark.status ?? StudentExamStatus.PRESENT;
      if (!allowedStatuses.includes(status as StudentExamStatus)) {
        throw new Error("Invalid student exam status.");
      }
      const rawMarks = mark.marksObtained;
      const parsed = rawMarks === null || rawMarks === undefined || rawMarks === ""
        ? null
        : Number(rawMarks);
      if (parsed !== null && !Number.isFinite(parsed)) {
        throw new Error("Marks obtained must be a valid number.");
      }
      return {
        studentEnrollmentId: mark.studentEnrollmentId,
        marksObtained: parsed,
        status: status as StudentExamStatus,
        remarks: typeof mark.remarks === "string" ? mark.remarks : null,
      };
    });

    const result = await studentExamMarkService.saveBulk(
      scheduleId,
      tenant.schoolId,
      sectionId,
      marks,
    );
    await recordAuditLog({
      actor: tenant,
      module: "ACADEMICS",
      action: "UPDATE",
      entityType: "EXAM_MARK",
      entityId: scheduleId,
      summary: `Saved ${marks.length} student exam marks from the mobile app.`,
      metadata: { recordCount: marks.length, sectionId },
    });
    return ApiResponse.success(result, "Student marks saved successfully.");
  });
}
