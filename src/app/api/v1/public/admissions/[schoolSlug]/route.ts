import { admissionPublicOptions, submitAdmission } from "@/features/admissions/admission.service";
import { publicAdmissionSchema } from "@/features/admissions/admission.schema";
import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { consumeRateLimit, requestIp } from "@/lib/rate-limit";
import { ApiResponse } from "@/lib/response";
import { requireSchoolSlug } from "@/lib/tenant-context";

type Context = { params: Promise<{ schoolSlug: string }> };

export async function GET(_: Request, { params }: Context) {
  return apiHandler(async () => {
    const { schoolSlug: rawSlug } = await params;
    const data = await admissionPublicOptions(requireSchoolSlug(rawSlug));
    return ApiResponse.success(data);
  });
}

export async function POST(request: Request, { params }: Context) {
  return apiHandler(async () => {
    const { schoolSlug: rawSlug } = await params;
    const schoolSlug = requireSchoolSlug(rawSlug);
    const ip = requestIp(request) || "unknown";
    const limit = await consumeRateLimit("public-admission", `${schoolSlug}:${ip}`, 10, 60 * 60 * 1000);
    if (!limit.allowed) throw new ApiError(429, `Too many attempts. Try again in ${limit.retryAfterSeconds} seconds.`);

    const input = await publicAdmissionSchema.parseAsync(await request.json());
    const data = await submitAdmission(schoolSlug, input);
    return ApiResponse.success(data, "Application submitted successfully.", 201);
  });
}
