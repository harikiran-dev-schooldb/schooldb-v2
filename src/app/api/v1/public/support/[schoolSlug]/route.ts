import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import {
  complaintByOptions,
  parentCategories,
  submitParentSupport,
} from "@/lib/parent-support";
import { consumeRateLimit, requestIp } from "@/lib/rate-limit";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";
import {
  claimParentSupportVerification,
  releaseParentSupportVerification,
} from "@/lib/parent-support-verification";
import { requireSchoolSlug } from "@/lib/tenant-context";

type Context = { params: Promise<{ schoolSlug: string }> };

const inputSchema = z.object({
  studentId: z.string().min(1),
  category: z.enum(parentCategories),
  subject: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(5000),
  complaintBy: z.enum(complaintByOptions),
  website: z.string().max(200).optional(),
});

export async function POST(request: Request, { params }: Context) {
  return apiHandler(async () => {
    const schoolSlug = requireSchoolSlug((await params).schoolSlug);
    const ip = requestIp(request) || "unknown";
    const limit = await consumeRateLimit("parent-support-submit", `${schoolSlug}:${ip}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) throw new ApiError(429, `Too many queries. Try again in ${limit.retryAfterSeconds} seconds.`);

    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Complete all required ticket details.");
    if (parsed.data.website) return ApiResponse.success({ ticketNo: "Submitted" }, "Query submitted.", 201);

    const { website: _website, ...input } = parsed.data;
    void _website;
    const school = await prisma.school.findUnique({
      where: { slug: schoolSlug },
      select: { id: true },
    });
    if (!school) throw new ApiError(404, "School not found.");

    const claim = await claimParentSupportVerification(request, school.id);
    if (!claim) {
      throw new ApiError(401, "Verify the registered mobile number before submitting a query.");
    }

    try {
      const ticket = await submitParentSupport({
        schoolSlug,
        ...input,
        parentPhone: claim.payload.phone,
      });
      await prisma.otpChallenge.deleteMany({ where: { id: claim.payload.challengeId } });
      return ApiResponse.success({ ticketNo: ticket.ticketNo }, "Query submitted to the school.", 201);
    } catch (error) {
      await releaseParentSupportVerification(claim.payload.challengeId, claim.consumedAt);
      throw error;
    }
  });
}
