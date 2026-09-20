import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { searchParentSupportStudents } from "@/lib/parent-support";
import { consumeRateLimit, requestIp } from "@/lib/rate-limit";
import { ApiResponse } from "@/lib/response";
import { requireSchoolSlug } from "@/lib/tenant-context";

type Context = { params: Promise<{ schoolSlug: string }> };

export async function GET(request: Request, { params }: Context) {
  return apiHandler(async () => {
    const schoolSlug = requireSchoolSlug((await params).schoolSlug);
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId")?.trim() || "";
    const sectionId = url.searchParams.get("sectionId")?.trim() || "";
    const query = url.searchParams.get("q")?.trim() || "";
    if (!classId || !sectionId || query.length < 3 || query.length > 80) {
      throw new ApiError(400, "Select class and section, then enter at least three characters of the student name or admission number.");
    }
    const ip = requestIp(request) || "unknown";
    const limit = await consumeRateLimit("parent-support-search", `${schoolSlug}:${ip}`, 30, 15 * 60 * 1000);
    if (!limit.allowed) throw new ApiError(429, `Too many searches. Try again in ${limit.retryAfterSeconds} seconds.`);
    const students = await searchParentSupportStudents({ schoolSlug, classId, sectionId, query });
    return ApiResponse.success(students);
  });
}
