import { z } from "zod";

import { setStaffAccountActive } from "@/features/users/staff-account.service";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { recordAuditLog } from "@/lib/audit";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const { active } = z.object({ active: z.boolean() }).parse(await request.json());
    const targetId = (await params).id;
    await setStaffAccountActive(
      membership.schoolId,
      targetId,
      membership.userId,
      membership.role,
      active,
    );
    await recordAuditLog({
      actor: membership,
      module: "STAFF",
      action: active ? "ENABLE" : "DISABLE",
      entityType: "MEMBERSHIP",
      entityId: targetId,
      summary: `${active ? "Enabled" : "Disabled"} a staff account.`,
    });
    return ApiResponse.success(null, active ? "Account enabled." : "Account disabled.");
  });
}
