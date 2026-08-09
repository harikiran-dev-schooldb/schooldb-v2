import { z } from "zod";

import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { attendanceService } from "@/features/attendance/services/attendance.service";

const correctionSchema = z.object({
  changes: z
    .array(
      z.object({
        studentId: z.string().min(1),

        status: z.enum([
          "PRESENT",
          "ABSENT",
          "LATE",
          "LEAVE",
        ]),

        remarks: z.string().optional(),
      }),
    )
    .min(1),
});

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  req: Request,
  { params }: Props,
) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { id } = await params;

    const body = await req.json();

    const input =
      correctionSchema.parse(body);

    const result =
      await attendanceService.bulkUpdateAttendance(
        tenant.schoolId,
        id,
        input.changes,
      );

    return ApiResponse.success(
      result,
      "Attendance corrected successfully.",
    );
  });
}