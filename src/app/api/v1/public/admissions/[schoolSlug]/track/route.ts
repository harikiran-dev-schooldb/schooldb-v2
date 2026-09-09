import { trackAdmissionSchema } from "@/features/admissions/admission.schema";
import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, requestIp } from "@/lib/rate-limit";
import { ApiResponse } from "@/lib/response";
import { requireSchoolSlug } from "@/lib/tenant-context";

export async function POST(request: Request, { params }: { params: Promise<{ schoolSlug: string }> }) {
  return apiHandler(async () => {
    const { schoolSlug: rawSlug } = await params;
    const schoolSlug = requireSchoolSlug(rawSlug);
    const input = await trackAdmissionSchema.parseAsync(await request.json());
    const limit = await consumeRateLimit("admission-track", `${schoolSlug}:${requestIp(request) || "unknown"}`, 20, 60 * 60 * 1000);
    if (!limit.allowed) throw new ApiError(429, "Too many tracking attempts. Please try again later.");

    const application = await prisma.admissionApplication.findFirst({
      where: {
        applicationNo: input.applicationNo,
        school: { slug: schoolSlug },
        OR: [{ fatherPhone: input.mobile }, { motherPhone: input.mobile }, { guardianPhone: input.mobile }],
      },
      select: {
        applicationNo: true,
        studentName: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        convertedAt: true,
        applyingClass: { select: { name: true } },
        preferredSection: { select: { name: true } },
        academicYear: { select: { name: true } },
        history: { orderBy: { createdAt: "desc" }, select: { toStatus: true, note: true, createdAt: true } },
        documents: { orderBy: { createdAt: "desc" }, select: { id: true, type: true, originalName: true, createdAt: true } },
      },
    });
    if (!application) throw new ApiError(404, "Application number and mobile number do not match.");
    return ApiResponse.success(application);
  });
}
