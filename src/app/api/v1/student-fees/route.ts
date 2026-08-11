import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import {
  studentFeeAssignmentSchema,
} from "@/features/student-fees/schemas/student-fee.schema";

import {
  studentFeeService,
} from "@/features/student-fees/services/student-fee.service";

export async function GET() {
  return apiHandler(async () => {
    const tenant =
      await requireTenant();

    const fees =
      await studentFeeService.list(
        tenant.schoolId,
      );

    return ApiResponse.success(fees);
  });
}

export async function POST(
  req: Request,
) {
  return apiHandler(async () => {
    const tenant =
      await requireTenant();

    const body =
      await validateBody(
        req,
        studentFeeAssignmentSchema,
      );

    const fee =
      await studentFeeService.assign(
        tenant.schoolId,
        body,
      );

    return ApiResponse.success(
      fee,
      "Fee plan assigned to student successfully.",
      201,
    );
  });
}