import { getExamPublishChecklist } from "@/features/exams/services/exam-publish-checklist.service";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { runSerializableTransaction } from "@/lib/prisma-transaction";
import { ApiResponse } from "@/lib/response";
import { hasModuleAccess } from "@/lib/staff-permissions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    if (!hasModuleAccess(tenant, "LEARNING", "MANAGE")) {
      return ApiResponse.error("You do not have access to publish exam results.", 403);
    }

    const { examId } = await params;
    const checklist = await runSerializableTransaction(async (tx) => {
      const exam = await tx.exam.findFirst({
        where: { id: examId, schoolId: tenant.schoolId },
        select: { id: true, schoolId: true, academicYearId: true },
      });
      return exam ? getExamPublishChecklist(tx, exam) : null;
    });
    return checklist
      ? ApiResponse.success(checklist)
      : ApiResponse.error("Exam not found.", 404);
  });
}
