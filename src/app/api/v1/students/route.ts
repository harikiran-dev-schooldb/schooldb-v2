import { apiHandler } from "@/lib/api";
import { requirePermission, requireRole } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/access-control";
import { ApiResponse } from "@/lib/response";

import { createStudentSchema } from "@/features/students/schemas/student.schema";
import { studentService } from "@/features/students/services/student.service";
import { StudentStatus } from "@/features/students/constants/student-status";
import { recordAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole([
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "RECEPTIONIST",
    ]);

    const body = await createStudentSchema.parseAsync(await req.json());

    const student = await studentService.create(tenant.schoolId, body);

    await recordAuditLog({
      actor: tenant,
      module: "STUDENTS",
      action: "CREATE",
      entityType: "STUDENT",
      entityId: student.id,
      summary: `Created student ${student.fullName || student.admissionNo} (${student.admissionNo}).`,
    });

    return ApiResponse.success(
      student,
      `Student created successfully. ${student.loginAccess.message}`,
      201,
    );
  });
}

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requirePermission(PERMISSIONS.STUDENT_DIRECTORY_READ);
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
    const page =
      Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
    const pageSize =
      Number.isFinite(pageSizeParam) && pageSizeParam > 0
        ? Math.min(Math.floor(pageSizeParam), 100)
        : 10;
    const search = searchParams.get("search") ?? undefined;
    const classId = searchParams.get("classId") || undefined;
    const sectionId = searchParams.get("sectionId") || undefined;

    const students = await studentService.list(tenant.schoolId, {
      page,
      pageSize,
      search,
      status,
      classId,
      sectionId,
    });
    return ApiResponse.success(students);
  });
}
