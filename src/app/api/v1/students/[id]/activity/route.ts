import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";
import { requireTenant } from "@/lib/auth";

import { studentActivityService } from "@/features/students/services/student-activity.service";

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
    const { id } = await params;

    const tenant = await requireTenant();

    if (!tenant) {
      throw new Error("Unauthorized.");
    }

    const { searchParams } = new URL(req.url);
    const take = Math.min(100, Math.max(10, Number(searchParams.get("take")) || 50));
    const rows =
      await studentActivityService.list(
        id,
        tenant.schoolId,
        { cursor: searchParams.get("cursor") || undefined, take },
      );
    const hasMore = rows.length > take;
    const activities = hasMore ? rows.slice(0, take) : rows;

    return ApiResponse.success({
      items: activities,
      nextCursor: hasMore ? activities.at(-1)?.id ?? null : null,
    });
  });
}
