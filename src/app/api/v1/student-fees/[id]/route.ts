import { studentFeeService } from "@/features/student-fees/services/student-fee.service";
import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _req: Request,
  { params }: Params,
) {
  return apiHandler(async () => {
    const tenant =
      await requireTenant();

    const { id } =
      await params;

    const fee =
      await studentFeeService.get(
        id,
        tenant.schoolId,
      );

    if (!fee) {
      return ApiResponse.error(
        "Student fee not found.",
        404,
      );
    }

    return ApiResponse.success(fee);
  });
}