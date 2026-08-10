import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import {
  customInstallmentsSchema,
} from "@/features/fees/schemas/custom-installment.schema";

import {
  customInstallmentService,
} from "@/features/fees/services/custom-installment.service";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  req: Request,
  { params }: Props,
) {
  return apiHandler(async () => {
    const tenant =
      await requireTenant();

    const { id } = await params;

    const result =
      await customInstallmentService.list(
        tenant.schoolId,
        id,
      );

    return ApiResponse.success(
      result,
    );
  });
}

export async function POST(
  req: Request,
  { params }: Props,
) {
  return apiHandler(async () => {
    const tenant =
      await requireTenant();

    const { id } = await params;

    const body = await req.json();

    const input =
      customInstallmentsSchema.parse(
        body,
      );

    const result =
      await customInstallmentService.create(
        tenant.schoolId,
        id,
        input,
      );

    return ApiResponse.success(
      result,
      "Custom installments configured successfully.",
      201,
    );
  });
}