import { z } from "zod";

import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { supportActor } from "@/lib/support-tickets";

const inputSchema = z.object({
  installationId: z.string().trim().min(8).max(200),
  fcmToken: z.string().trim().min(20).max(4096),
  appVersion: z.string().trim().max(50).optional(),
});

export async function POST(request: Request) {
  return apiHandler(async () => {
    const actor = await supportActor();
    const input = inputSchema.safeParse(await request.json());
    if (!input.success) throw new ApiError(400, "Invalid push device registration.");

    await prisma.pushDevice.upsert({
      where: { installationId: input.data.installationId },
      create: {
        schoolId: actor.schoolId,
        userId: actor.userId,
        installationId: input.data.installationId,
        fcmToken: input.data.fcmToken,
        app: "SCHOOL_SUPPORT",
        platform: "ANDROID",
        appVersion: input.data.appVersion,
        enabled: true,
        lastSeenAt: new Date(),
      },
      update: {
        schoolId: actor.schoolId,
        userId: actor.userId,
        fcmToken: input.data.fcmToken,
        app: "SCHOOL_SUPPORT",
        platform: "ANDROID",
        appVersion: input.data.appVersion,
        enabled: true,
        lastSeenAt: new Date(),
      },
    });

    return ApiResponse.success({ registered: true });
  });
}

export async function DELETE(request: Request) {
  return apiHandler(async () => {
    const actor = await supportActor();
    const url = new URL(request.url);
    const installationId = url.searchParams.get("installationId")?.trim();
    if (!installationId) throw new ApiError(400, "installationId is required.");

    await prisma.pushDevice.updateMany({
      where: {
        installationId,
        schoolId: actor.schoolId,
        userId: actor.userId,
        app: "SCHOOL_SUPPORT",
      },
      data: { enabled: false },
    });
    return ApiResponse.success({ registered: false });
  });
}
