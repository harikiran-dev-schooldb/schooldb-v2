import { requireMembership } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";

export async function GET() {
  return apiHandler(async () => {
    const membership = await requireMembership();
    const fullName = [membership.user.firstName, membership.user.lastName]
      .filter(Boolean)
      .join(" ");

    return ApiResponse.success({
      userName: fullName || membership.user.email,
      schoolName: membership.school.name,
      schoolSlug: membership.school.slug,
      role: membership.role,
    });
  });
}
