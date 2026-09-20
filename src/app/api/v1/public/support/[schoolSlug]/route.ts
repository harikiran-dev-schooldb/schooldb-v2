import { z } from "zod";

import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { parentCategories, submitParentSupport } from "@/lib/parent-support";
import { consumeRateLimit, requestIp } from "@/lib/rate-limit";
import { ApiResponse } from "@/lib/response";
import { requireSchoolSlug } from "@/lib/tenant-context";

type Context = { params: Promise<{ schoolSlug: string }> };

const inputSchema = z.object({
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  studentId: z.string().min(1),
  category: z.enum(parentCategories),
  subject: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(5000),
  parentName: z.string().trim().max(100).optional(),
  parentPhone: z.string().trim().regex(/^[+0-9()\s-]{10,20}$/).optional().or(z.literal("")),
  website: z.string().max(200).optional(),
});

export async function POST(request: Request, { params }: Context) {
  return apiHandler(async () => {
    const schoolSlug = requireSchoolSlug((await params).schoolSlug);
    const ip = requestIp(request) || "unknown";
    const limit = await consumeRateLimit("parent-support-submit", `${schoolSlug}:${ip}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) throw new ApiError(429, `Too many queries. Try again in ${limit.retryAfterSeconds} seconds.`);

    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Complete all required fields and check the contact number.");
    if (parsed.data.website) return ApiResponse.success({ ticketNo: "Submitted" }, "Query submitted.", 201);

    const { website: _website, ...input } = parsed.data;
    void _website;
    const ticket = await submitParentSupport({ schoolSlug, ...input });
    return ApiResponse.success({ ticketNo: ticket.ticketNo }, "Query submitted to the school.", 201);
  });
}
