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


export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page") ?? 1);

const pageSize = Number(searchParams.get("pageSize") ?? 10);

const search = searchParams.get("search") ?? undefined;

const students = await studentService.list(
  tenant.schoolId,
  {
    page,
    pageSize,
    search,
  }
);

    return ApiResponse.success(students);
  });
}
