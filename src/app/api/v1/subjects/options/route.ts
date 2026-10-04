import { apiHandler } from "@/lib/api";
import { classTeacherScope, requireCurrentTeacher, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { subjectService } from "@/features/subjects/services/subject.service";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const options = await subjectService.options(tenant.schoolId);

    if (tenant.role === "TEACHER") {
      const [teacher, classAssignments] = await Promise.all([
        requireCurrentTeacher(tenant.schoolId),
        classTeacherScope(tenant.schoolId),
      ]);
      const subjectRows = await prisma.subject.findMany({
        where: {
          schoolId: tenant.schoolId,
          active: true,
          OR: [
            { allocations: { some: { teacherId: teacher.id, active: true } } },
            ...(classAssignments.length
              ? [{ classSubjects: { some: { active: true, OR: classAssignments.map((item) => ({ academicYearId: item.academicYearId, classId: item.classId })) } } }]
              : []),
          ],
        },
        select: { id: true },
      });
      const allowed = new Set(subjectRows.map((item) => item.id));
      return ApiResponse.success(options.filter((option) => allowed.has(option.id)));
    }

    return ApiResponse.success(options);
  });
}
