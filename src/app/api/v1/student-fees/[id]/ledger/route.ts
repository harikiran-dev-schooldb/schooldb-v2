import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import {
  studentFeeLedgerService,
} from "@/features/student-fees/services/student-fee-ledger.service";

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

    const ledger =
      await studentFeeLedgerService.get(
        id,
        tenant.schoolId,
      );

    if (!ledger) {
      return ApiResponse.error(
        "Student fee not found.",
        404,
      );
    }

    return ApiResponse.success(
      ledger,
    );
  });
}