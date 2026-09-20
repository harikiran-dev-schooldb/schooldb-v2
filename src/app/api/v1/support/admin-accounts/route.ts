import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { ApiResponse } from "@/lib/response";
import {
  createAdminAccount,
  listAdminAccounts,
} from "@/features/users/admin-account.service";

export async function GET() {
  return apiHandler(async () => {
    const actor = await requireRole(["SUPER_ADMIN"]);
    return ApiResponse.success({
      accounts: await listAdminAccounts(actor.schoolId),
      actorUserId: actor.userId,
    });
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const actor = await requireRole(["SUPER_ADMIN"]);
    const account = await createAdminAccount(
      actor.schoolId,
      actor.school.slug,
      await request.json(),
    );
    await recordAuditLog({
      actor,
      module: "STAFF",
      action: "CREATE",
      entityType: "MEMBERSHIP",
      entityId: account.id,
      summary: "Created an administrator WhatsApp login account.",
    });
    return ApiResponse.success(account, "Administrator account created.", 201);
  });
}
