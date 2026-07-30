import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { createStudentSchema } from "@/features/students/schemas/student.schema";
import { studentService } from "@/features/students/services/student.service";

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const body = await validateBody(
      req,
      createStudentSchema
    );

    const student = await studentService.create(
      tenant.schoolId,
      body
    );

    return ApiResponse.success(
      student,
      "Student created successfully.",
      201
    );
  });
}


export async function GET() {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const students = await studentService.getAll(
      tenant.schoolId
    );

    return ApiResponse.success(students);
  });
}
