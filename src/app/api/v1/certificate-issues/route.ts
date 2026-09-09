import { issueCertificate } from "@/features/students/services/certificate-issue.service";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

export async function POST(request: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const issuedByName = [membership.user.firstName, membership.user.lastName].filter(Boolean).join(" ") || membership.user.email;
    const result = await issueCertificate(membership.schoolId, membership.school.slug, membership.userId, issuedByName, await request.json());
    return ApiResponse.success(result, "Certificate issued successfully.", 201);
  });
}
