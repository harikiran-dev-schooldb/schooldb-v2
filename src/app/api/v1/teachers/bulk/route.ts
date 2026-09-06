import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { teacherSchema } from "@/features/teachers/schemas/teacher.schema";
import { teacherService } from "@/features/teachers/services/teacher.service";

type BulkTeacher = {
  employeeId: string;
  fullName: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  dob: string;
  joiningDate: string;
  phone: string;
  email: string;
  qualification: string;
  designation: string;
  active: boolean;
};

type RowError = {
  row: number;
  message: string;
};

const MAX_ROWS = 500;

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = (await req.json()) as { teachers?: BulkTeacher[] };
    const teachers = body.teachers ?? [];

    if (!teachers.length) {
      throw new Error("No teachers were supplied for import.");
    }

    if (teachers.length > MAX_ROWS) {
      throw new Error(`Maximum ${MAX_ROWS} teachers can be imported at once.`);
    }

    const errors: RowError[] = [];
    let created = 0;

    for (let index = 0; index < teachers.length; index += 1) {
      const parsed = teacherSchema.safeParse(teachers[index]);

      if (!parsed.success) {
        errors.push({
          row: index + 2,
          message: parsed.error.issues.map((issue) => issue.message).join("; "),
        });
        continue;
      }

      try {
        await teacherService.create(tenant.schoolId, parsed.data);
        created += 1;
      } catch (error) {
        errors.push({
          row: index + 2,
          message:
            error instanceof Error
              ? error.message
              : "Unable to create teacher.",
        });
      }
    }

    return ApiResponse.success(
      {
        created,
        failed: errors.length,
        errors,
      },
      "Bulk teacher import processed.",
    );
  });
}
