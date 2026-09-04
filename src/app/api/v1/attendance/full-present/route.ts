import { z } from "zod";

import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { attendanceService } from "@/features/attendance/services/attendance.service";

const fullPresentSchema = z.object({
  academicYearId: z.string().min(1),
  attendanceDate: z.string().min(1),
  scope: z.enum(["SCHOOL", "CLASS", "SECTION"]),
  classId: z.string().optional(),
  sectionId: z.string().optional(),
});

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = fullPresentSchema.parse(await req.json());
    const result = await attendanceService.markFullPresent(
      tenant.schoolId,
      body,
    );

    return ApiResponse.success(
      result,
      "Full attendance marked present successfully.",
    );
  });
}
