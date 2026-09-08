import { importLibraryCatalog } from "@/features/library/bulk";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

export async function POST(request: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = (await request.json()) as { books?: unknown };
    const result = await importLibraryCatalog(membership.schoolId, body.books);
    return ApiResponse.success(result, "Library catalog imported successfully.", 201);
  });
}
