import { createStaffAccount } from "@/features/users/staff-account.service";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { recordAuditLog } from "@/lib/audit";

export async function POST(request: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const account = await createStaffAccount(
      membership.schoolId,
      membership.school.slug,
      membership.role,
      await request.json(),
    );
    await recordAuditLog({
      actor: membership,
      module: "STAFF",
      action: "CREATE",
      entityType: "USER",
      entityId: account.id,
      summary: "Created a staff WhatsApp login account.",
    });
    return ApiResponse.success(account, "Staff WhatsApp login created.", 201);
  });
}
