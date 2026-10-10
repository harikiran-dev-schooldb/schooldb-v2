import { Gender } from "@/generated/prisma/enums";
import { studentDirectorySummary } from "@/features/students/services/student-directory-summary.service";
import { PERMISSIONS } from "@/lib/access-control";
import { apiHandler } from "@/lib/api";
import { requirePermission, teacherClassScope } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { hasModuleAccess } from "@/lib/staff-permissions";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const tenant = await requirePermission(PERMISSIONS.STUDENT_DIRECTORY_READ);
    const params = new URL(request.url).searchParams;
    const genderParam = params.get("gender");
    const gender = genderParam && Object.values(Gender).includes(genderParam as Gender)
      ? genderParam as Gender
      : undefined;
    if (genderParam && !gender) {
      return ApiResponse.error("Invalid gender.", 400);
    }
    const rteParam = params.get("isRte");
    const classSections = tenant.role === "TEACHER"
      ? await teacherClassScope(tenant.schoolId)
      : undefined;

    const summary = await studentDirectorySummary(
      tenant.schoolId,
      {
        syllabusId: params.get("syllabusId") || undefined,
        branchId: params.get("branchId") || undefined,
        classId: params.get("classId") || undefined,
        sectionId: params.get("sectionId") || undefined,
        gender,
        isRte: rteParam === "true" ? true : rteParam === "false" ? false : undefined,
      },
      {
        attendance: hasModuleAccess(tenant, "ATTENDANCE", "VIEW"),
        fees: hasModuleAccess(tenant, "FEES", "VIEW"),
        classSections,
      },
    );

    return ApiResponse.success(summary);
  });
}
