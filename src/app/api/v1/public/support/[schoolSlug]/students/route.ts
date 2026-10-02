import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { searchParentSupportStudents } from "@/lib/parent-support";
import { consumeRateLimit, requestIp } from "@/lib/rate-limit";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";
import { requireParentSupportVerification } from "@/lib/parent-support-verification";
import { requireSchoolSlug } from "@/lib/tenant-context";

type Context = { params: Promise<{ schoolSlug: string }> };

export async function GET(request: Request, { params }: Context) {
  return apiHandler(async () => {
    const schoolSlug = requireSchoolSlug((await params).schoolSlug);
    const school = await prisma.school.findUnique({
      where: { slug: schoolSlug },
      select: { id: true },
    });
    if (!school) throw new ApiError(404, "School not found.");
    const verification = await requireParentSupportVerification(request, school.id);
    if (!verification) {
      throw new ApiError(401, "Verify the registered mobile number before viewing students.");
    }
    const ip = requestIp(request) || "unknown";
    const limit = await consumeRateLimit("parent-support-search", `${schoolSlug}:${ip}`, 30, 15 * 60 * 1000);
    if (!limit.allowed) throw new ApiError(429, `Too many searches. Try again in ${limit.retryAfterSeconds} seconds.`);
    const students = await searchParentSupportStudents({
      schoolSlug,
      mobile: verification.phone,
    });
    return ApiResponse.success(students);
  });
}
