import { z } from "zod";

import { isValidUpiId } from "@/features/online-payments/direct-upi";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

const directUpiSettingsSchema = z.object({
  schoolSlug: z.string().trim().min(1).max(120),
  enabled: z.boolean(),
  upiId: z.string().trim().max(120),
  payeeName: z.string().trim().max(160),
});

export async function POST(request: Request) {
  return apiHandler(async () => {
    const input = directUpiSettingsSchema.parse(await request.json());
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], input.schoolSlug);

    if (input.enabled && !isValidUpiId(input.upiId)) {
      throw new ApiError(400, "Enter a valid school UPI ID, for example school@bank.");
    }

    const school = await prisma.school.update({
      where: { id: membership.schoolId },
      data: {
        directUpiEnabled: input.enabled,
        directUpiId: input.upiId || null,
        directUpiPayeeName: input.payeeName || membership.school.name,
      },
      select: {
        directUpiEnabled: true,
        directUpiId: true,
        directUpiPayeeName: true,
      },
    });

    return ApiResponse.success(school, "Direct UPI settings saved successfully.");
  });
}
