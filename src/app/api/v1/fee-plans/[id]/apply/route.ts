import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { studentFeeService } from "@/features/student-fees/services/student-fee.service";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: Request, { params }: Props) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);

    const { id: feePlanId } = await params;

    const result = await studentFeeService.applyFeePlanToStudents(
      tenant.schoolId,
      feePlanId,
    );

    return ApiResponse.success(
      result,
      `Fee plan applied successfully. ${result.created} student fees created.`,
    );
  });
}
