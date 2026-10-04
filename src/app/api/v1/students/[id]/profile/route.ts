import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";
import { requirePermission, requireTeacherFeatureAccess, requireTeacherStudent, requireTenant } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/access-control";

import { studentService } from "@/features/students/services/student.service";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  req: Request,
  { params }: Props
) {
  return apiHandler(async () => {
    const { id } = await params;

    const tenant = await requireTenant();
    if (tenant.role === "TEACHER") {
      await requireTeacherFeatureAccess("STUDENTS");
      await requireTeacherStudent(id);
    } else {
      await requirePermission(PERMISSIONS.STUDENT_PRIVATE_READ);
    }

    const student = await studentService.profile(
      id,
      tenant.schoolId
    );

    return ApiResponse.success(student);
  });
}
