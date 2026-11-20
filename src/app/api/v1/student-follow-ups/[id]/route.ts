import { updateFollowUpSchema } from "@/features/student-follow-ups/student-follow-up";
import { requireStudentFollowUpAccess, updateFollowUp } from "@/features/student-follow-ups/student-follow-up.service";
import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  return apiHandler(async () => {
    const access = await requireStudentFollowUpAccess();
    const { id } = await context.params;
    const input = updateFollowUpSchema.safeParse(await request.json());
    if (!input.success) {
      return ApiResponse.error(input.error.issues[0]?.message || "Invalid follow-up update.", 400);
    }
    return ApiResponse.success(await updateFollowUp(access, id, input.data), "Follow-up updated.");
  });
}
