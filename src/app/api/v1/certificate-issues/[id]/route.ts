import { cancelCertificateIssue, recordCertificatePrint } from "@/features/students/services/certificate-issue.service";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

type Context = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Context) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    await recordCertificatePrint(membership.schoolId, (await params).id);
    return ApiResponse.success(null, "Print recorded.");
  });
}

export async function PATCH(request: Request, { params }: Context) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = await request.json() as { cancellationNote?: unknown };
    const cancelledByName = [membership.user.firstName, membership.user.lastName].filter(Boolean).join(" ") || membership.user.email;
    await cancelCertificateIssue(membership.schoolId, (await params).id, cancelledByName, body.cancellationNote);
    return ApiResponse.success(null, "Certificate cancelled.");
  });
}
