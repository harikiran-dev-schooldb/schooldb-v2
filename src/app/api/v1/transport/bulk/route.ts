import { importTransportData } from "@/features/transport/bulk";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

export async function POST(request: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = (await request.json()) as { rows?: unknown };
    const result = await importTransportData(membership.schoolId, body.rows);
    return ApiResponse.success(result, "Transport data imported successfully.", 201);
  });
}
