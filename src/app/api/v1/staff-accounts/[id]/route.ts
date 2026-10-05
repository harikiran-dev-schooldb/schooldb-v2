import { z } from "zod";

import {
  setStaffAccountActive,
  updateStaffAccount,
} from "@/features/users/staff-account.service";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = await request.json();
    const targetId = (await params).id;

    const isStatusOnlyUpdate =
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      Object.keys(body).length === 1 &&
      Object.prototype.hasOwnProperty.call(body, "active");

    if (isStatusOnlyUpdate) {
      const { active } = z.object({ active: z.boolean() }).parse(body);

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

      return ApiResponse.success(
        null,
        active ? "Account enabled." : "Account disabled.",
      );
    }

    const account = await updateStaffAccount(
      membership.schoolId,
      membership.school.slug,
      targetId,
      membership.userId,
      membership.role,
      body,
    );

    await recordAuditLog({
      actor: membership,
      module: "STAFF",
      action: "UPDATE",
      entityType: "MEMBERSHIP",
      entityId: account.id,
      summary: "Updated a staff user profile and access settings.",
    });

    return ApiResponse.success(account, "Staff user updated.");
  });
}
