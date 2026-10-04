import { apiHandler } from "@/lib/api";
import { requireTeacherFeatureAccess, requireTenant, teacherClassScope } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { studentService } from "@/features/students/services/student.service";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { searchParams } = new URL(request.url);

    const academicYearId = searchParams.get("academicYearId");

    const excludeEnrollmentId =
      searchParams.get("excludeEnrollmentId") ?? undefined;

    const classId = searchParams.get("classId") ?? undefined;
    const sectionId = searchParams.get("sectionId") ?? undefined;

    const mode =
      searchParams.get("mode") === "enrolled" ? "ENROLLED" : "AVAILABLE";

    if (!academicYearId) {
      throw new Error("Academic year is required.");
    }

    const teacherScope = tenant.role === "TEACHER"
      ? await teacherClassScope(tenant.schoolId)
      : undefined;
    if (tenant.role === "TEACHER") {
      await requireTeacherFeatureAccess("STUDENTS");
      if (mode !== "ENROLLED") {
        throw new Error("Teachers can only select students already enrolled in their assigned classes.");
      }
    }

    const students = await studentService.options(
      tenant.schoolId,
      academicYearId,
      excludeEnrollmentId,
      mode,
      classId,
      sectionId,
      teacherScope,
    );

    return ApiResponse.success(students);
  });
}
