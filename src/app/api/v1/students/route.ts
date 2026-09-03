import { apiHandler } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { createStudentSchema } from "@/features/students/schemas/student.schema";
import { studentService } from "@/features/students/services/student.service";
import { StudentStatus } from "@/features/students/constants/student-status";

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "RECEPTIONIST"]);

    const body = await createStudentSchema.parseAsync(await req.json());

    const student = await studentService.create(tenant.schoolId, body);

    return ApiResponse.success(student, "Student created successfully.", 201);
  });
}

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");

    let status: StudentStatus | undefined;
    if (statusParam) {
      const validStatuses = Object.values(StudentStatus);
      if (!validStatuses.includes(statusParam as StudentStatus)) {
        return ApiResponse.error("Invalid student status.", 400);
      }
      status = statusParam as StudentStatus;
    }

    const pageParam = Number(searchParams.get("page") ?? "1");
    const pageSizeParam = Number(searchParams.get("pageSize") ?? "10");
    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
    const pageSize = Number.isFinite(pageSizeParam) && pageSizeParam > 0 ? Math.min(Math.floor(pageSizeParam), 100) : 10;
    const search = searchParams.get("search") ?? undefined;

    const students = await studentService.list(tenant.schoolId, { page, pageSize, search, status });
    return ApiResponse.success(students);
  });
}