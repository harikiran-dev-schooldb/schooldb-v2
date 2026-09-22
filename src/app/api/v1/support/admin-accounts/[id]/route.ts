import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { ApiResponse } from "@/lib/response";
import { updateAdminAccount } from "@/features/users/admin-account.service";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  return apiHandler(async () => {
    const actor = await requireRole(["SUPER_ADMIN"]);
    const account = await updateAdminAccount(
      actor.schoolId,
      actor.school.slug,
      actor.userId,
      (await params).id,
      await request.json(),
    );
    await recordAuditLog({
      actor,
      module: "STAFF",
      action: "UPDATE",
      entityType: "MEMBERSHIP",
      entityId: account.id,
      summary: "Updated an administrator WhatsApp login account.",
    });
    return ApiResponse.success(account, "Administrator account updated.");
  });
}


// Android HttpURLConnection is intentionally kept on POST for support mutations.
export const POST = PATCH;
