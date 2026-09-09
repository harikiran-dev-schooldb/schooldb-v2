import { z } from "zod";

import { setStaffAccountActive } from "@/features/users/staff-account.service";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const { active } = z.object({ active: z.boolean() }).parse(await request.json());
    await setStaffAccountActive(
      membership.schoolId,
      (await params).id,
      membership.userId,
      membership.role,
      active,
    );
    return ApiResponse.success(null, active ? "Account enabled." : "Account disabled.");
  });
}
