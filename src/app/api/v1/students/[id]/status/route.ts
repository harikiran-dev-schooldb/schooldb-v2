import { NextRequest } from "next/server";

import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";
import { requireRole } from "@/lib/auth";

import { changeStudentStatusSchema } from "@/features/students/schemas/change-status.schema";
import { studentService } from "@/features/students/services/student.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);

    const { id } = await params;

    const body = await req.json();

    const data = changeStudentStatusSchema.parse(body);

    const student = await studentService.changeStatus(
      id,
      tenant.schoolId,
      data.status,
      data.remarks,
    );

    return ApiResponse.success(student, "Student status updated successfully.");
  });
}
