import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import {
  feeInstallmentService,
} from "@/features/fees/services/fee-installment.service";

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
    const tenant =
      await requireTenant();

    const { id } = await params;

    const result =
      await feeInstallmentService.generate(
        tenant.schoolId,
        id,
      );

    return ApiResponse.success(
      result,
      "Fee installments generated successfully.",
    );
  });
}