import { createFollowUpSchema, listFollowUpsSchema } from "@/features/student-follow-ups/student-follow-up";
import { createFollowUp, listFollowUps, requireStudentFollowUpAccess } from "@/features/student-follow-ups/student-follow-up.service";
import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const access = await requireStudentFollowUpAccess();
    const params = new URL(request.url).searchParams;
    const input = listFollowUpsSchema.safeParse({
      status: params.get("status") ?? undefined,
      scope: params.get("scope") ?? undefined,
      page: params.get("page") ?? undefined,
    });
    if (!input.success) return ApiResponse.error("Invalid follow-up filters.", 400);
    return ApiResponse.success(await listFollowUps(access, input.data));
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const access = await requireStudentFollowUpAccess();
    const input = createFollowUpSchema.safeParse(await request.json());
    if (!input.success) {
      return ApiResponse.error(input.error.issues[0]?.message || "Invalid follow-up.", 400);
    }
    return ApiResponse.success(await createFollowUp(access, input.data), "Follow-up created.", 201);
  });
}
