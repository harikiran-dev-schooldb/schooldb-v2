import { z } from "zod";

import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

const deviceSchema = z.object({
  installationId: z.string().trim().min(10).max(200),
  appVersion: z.string().trim().max(40).optional(),
});

export async function POST(request: Request) {
  return apiHandler(async () => {
    const membership = await requireTenant();
    const input = await validateBody(request, deviceSchema);
    const device = await prisma.pushDevice.upsert({
      where: { installationId: input.installationId },
      create: {
        schoolId: membership.schoolId,
        userId: membership.userId,
        installationId: input.installationId,
        appVersion: input.appVersion,
      },
      update: {
        schoolId: membership.schoolId,
        userId: membership.userId,
        appVersion: input.appVersion,
        enabled: true,
        lastSeenAt: new Date(),
      },
      select: { id: true },
    });
    return ApiResponse.success(device, "Push notifications enabled.");
  });
}

export async function DELETE(request: Request) {
  return apiHandler(async () => {
    const membership = await requireTenant();
    const input = await validateBody(request, deviceSchema.pick({ installationId: true }));
    await prisma.pushDevice.updateMany({
      where: { installationId: input.installationId, userId: membership.userId },
      data: { enabled: false, lastSeenAt: new Date() },
    });
    return ApiResponse.success({ disabled: true }, "Push notifications disabled.");
  });
}
