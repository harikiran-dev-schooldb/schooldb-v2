import { convertAdmissionSchema } from "@/features/admissions/admission.schema";
import { convertAdmission } from "@/features/admissions/admission.service";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return apiHandler(async () => {
    const actor = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const { id } = await params;
    const input = await convertAdmissionSchema.parseAsync(await request.json());
    const changedBy =
      [actor.user.firstName, actor.user.lastName].filter(Boolean).join(" ") ||
      actor.designation ||
      "School administrator";
    const student = await convertAdmission({
      id,
      schoolId: actor.schoolId,
      ...input,
      changedBy,
    });
    await recordAuditLog({
      actor,
      module: "ADMISSIONS",
      action: "CREATE",
      entityType: "STUDENT",
      entityId: student.id,
      summary: `Converted an online application into student ${student.fullName || student.admissionNo} (${student.admissionNo}).`,
    });
    return ApiResponse.success(
      student,
      `Student created successfully. ${student.loginAccess.message}`,
      201,
    );
  });
}
