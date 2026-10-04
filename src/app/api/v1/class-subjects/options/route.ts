import { apiHandler } from "@/lib/api";
import { classTeacherScope, requireTenant, teacherAllocationScope } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { classSubjectService } from "@/features/class-subjects/services/class-subject.service";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { searchParams } = new URL(request.url);

    const academicYearId = searchParams.get("academicYearId");
    const classId = searchParams.get("classId");

    if (!academicYearId) {
      throw new Error("Academic year is required.");
    }

    if (!classId) {
      throw new Error("Class is required.");
    }

    const options = await classSubjectService.options(
      tenant.schoolId,
      academicYearId,
      classId,
    );

    if (tenant.role === "TEACHER") {
      const [allocations, classAssignments] = await Promise.all([
        teacherAllocationScope(tenant.schoolId),
        classTeacherScope(tenant.schoolId),
      ]);
      const isClassTeacher = classAssignments.some(
        (item) => item.academicYearId === academicYearId && item.classId === classId,
      );
      if (!isClassTeacher) {
        const subjectIds = new Set(
          allocations
            .filter((item) => item.academicYearId === academicYearId && item.classId === classId)
            .map((item) => item.subjectId),
        );
        return ApiResponse.success(options.filter((item) => subjectIds.has(item.id)));
      }
    }

    return ApiResponse.success(options);
  });
}
