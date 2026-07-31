import { NextRequest } from "next/server";

import { ApiResponse } from "@/lib/response";
import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";

import { createStudentSchema } from "@/features/students/schemas/student.schema";
import { studentService } from "@/features/students/services/student.service";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const body = await req.json();

    const data = createStudentSchema.parse(body);

    const { id } = await params;

    const student = await studentService.update(
      id,
      tenant.schoolId,
      data
    );

    return ApiResponse.success(
      student,
      "Student updated successfully."
    );
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { id } = await params;

    const student = await studentService.getById(
      id,
      tenant.schoolId
    );

    return ApiResponse.success(student);
  });
}