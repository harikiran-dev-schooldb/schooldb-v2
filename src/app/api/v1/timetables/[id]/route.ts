import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { timetableSchema } from "@/features/timetable/schemas/timetable.schema";
import { timetableService } from "@/features/timetable/services/timetable.service";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  req: Request,
  { params }: Props
) {
  return apiHandler(async () => {
    const tenant =
      await requireTenant();

    const { id } = await params;

    const timetable =
      await timetableService.get(
        id,
        tenant.schoolId
      );

    return ApiResponse.success(
      timetable
    );
  });
}

export async function PUT(
  req: Request,
  { params }: Props
) {
  return apiHandler(async () => {
    const tenant =
      await requireTenant();

    const { id } = await params;

    const body =
      await validateBody(
        req,
        timetableSchema
      );

    const timetable =
      await timetableService.update(
        id,
        tenant.schoolId,
        body
      );

    return ApiResponse.success(
      timetable,
      "Timetable updated successfully."
    );
  });
}