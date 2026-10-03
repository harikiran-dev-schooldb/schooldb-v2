import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";

import { apiHandler } from "@/lib/api";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

const subscriptionSchema = z.object({
  endpoint: z.url().max(4096),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().trim().min(20).max(4096),
    auth: z.string().trim().min(10).max(4096),
  }),
});

const deviceSchema = z.object({
  schoolSlug: z.string().trim().min(1).max(120),
  installationId: z.string().trim().min(10).max(200),
  fcmToken: z.string().trim().min(20).max(4096).optional(),
  webPushSubscription: subscriptionSchema.optional(),
});

const registrationSchema = deviceSchema.refine(
  (input) => Boolean(input.fcmToken || input.webPushSubscription),
  { message: "A Firebase token or Web Push subscription is required." },
);

export async function POST(request: Request) {
  return apiHandler(async () => {
    const input = await validateBody(request, registrationSchema);
    const membership = await requireMembership(input.schoolSlug);
    const webPushSubscription = input.webPushSubscription
      ? (input.webPushSubscription as Prisma.InputJsonValue)
      : Prisma.DbNull;
    const device = await prisma.pushDevice.upsert({
      where: { installationId: input.installationId },
      create: {
        schoolId: membership.schoolId,
        userId: membership.userId,
        installationId: input.installationId,
        fcmToken: input.fcmToken ?? null,
        webPushSubscription,
        platform: "WEB",
        appVersion: "web",
      },
      update: {
        schoolId: membership.schoolId,
        userId: membership.userId,
        fcmToken: input.fcmToken ?? null,
        webPushSubscription,
        platform: "WEB",
        appVersion: "web",
        enabled: true,
        lastSeenAt: new Date(),
      },
      select: { id: true },
    });
    return ApiResponse.success(device, "Browser notifications enabled.");
  });
}

export async function DELETE(request: Request) {
  return apiHandler(async () => {
    const input = await validateBody(request, deviceSchema.omit({ fcmToken: true }));
    const membership = await requireMembership(input.schoolSlug);
    await prisma.pushDevice.updateMany({
      where: {
        installationId: input.installationId,
        schoolId: membership.schoolId,
        userId: membership.userId,
        platform: "WEB",
      },
      data: { enabled: false, lastSeenAt: new Date() },
    });
    return ApiResponse.success({ disabled: true }, "Browser notifications disabled.");
  });
}
