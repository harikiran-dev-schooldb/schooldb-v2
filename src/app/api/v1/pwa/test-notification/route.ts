import { z } from "zod";

import { mapWithConcurrency } from "@/features/notifications/batch";
import { recordPushDeliveryReport } from "@/features/notifications/push";
import { apiHandler } from "@/lib/api";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import {
  isExpiredWebPushError,
  parseStoredWebPushSubscription,
  sendStandardWebPush,
  standardWebPushConfigured,
} from "@/lib/web-push";
import { validateBody } from "@/lib/validation";

const schema = z.object({
  schoolSlug: z.string().trim().min(1).max(120),
});

export async function POST(request: Request) {
  return apiHandler(async () => {
    const input = await validateBody(request, schema);
    const membership = await requireMembership(input.schoolSlug);
    const devices = await prisma.pushDevice.findMany({
      where: {
        schoolId: membership.schoolId,
        userId: membership.userId,
        platform: "WEB",
        enabled: true,
      },
      select: { id: true, webPushSubscription: true },
    });
    const subscriptions = devices.flatMap((device) => {
      const subscription = parseStoredWebPushSubscription(device.webPushSubscription);
      return subscription ? [{ id: device.id, subscription }] : [];
    });

    if (!subscriptions.length) {
      await recordPushDeliveryReport({
        schoolId: membership.schoolId,
        initiatedByUserId: membership.userId,
        kind: "TEST",
        title: "iPhone test notification",
        audienceUsers: 1,
        preferenceEnabledUsers: 1,
        noDeviceUsers: 1,
        status: "NO_DEVICE",
      });
      return ApiResponse.error(
        "No active iPhone PWA subscription was found. Install SchoolDB on the Home Screen and enable notifications first.",
        409,
      );
    }
    if (!standardWebPushConfigured()) {
      return ApiResponse.error("Web Push VAPID credentials are not configured.", 503);
    }

    const origin = process.env.NEXT_PUBLIC_BASE_URL || "https://schooldb.co.in";
    const link = new URL(`/${input.schoolSlug}/pwa`, origin).href;
    const results = await mapWithConcurrency(subscriptions, 10, async (device) => {
      try {
        await sendStandardWebPush(device.subscription, {
          title: "SchoolDB iPhone test",
          body: "Notifications are working on this device.",
          link,
          tag: `pwa-test-${membership.userId}`,
          appBadge: 1,
          data: { category: "TEST", schoolId: membership.schoolId },
        });
        return { id: device.id, accepted: true as const };
      } catch (error) {
        return { id: device.id, accepted: false as const, error };
      }
    });
    const accepted = results.filter((result) => result.accepted).length;
    const failed = results.length - accepted;
    const invalidIds = results.flatMap((result) =>
      !result.accepted && isExpiredWebPushError(result.error) ? [result.id] : [],
    );
    if (invalidIds.length) {
      await prisma.pushDevice.updateMany({
        where: { id: { in: invalidIds } },
        data: { enabled: false },
      });
    }
    await recordPushDeliveryReport({
      schoolId: membership.schoolId,
      initiatedByUserId: membership.userId,
      kind: "TEST",
      title: "iPhone test notification",
      audienceUsers: 1,
      preferenceEnabledUsers: 1,
      eligibleDevices: subscriptions.length,
      standardWebDevices: subscriptions.length,
      accepted,
      failed,
      invalidDevices: invalidIds.length,
      status: accepted > 0 ? failed > 0 ? "PARTIAL" : "ACCEPTED" : "FAILED",
    });

    if (!accepted) {
      return ApiResponse.error(
        invalidIds.length
          ? "The saved iPhone subscription expired. Enable notifications again and retry."
          : "Apple did not accept the test notification. Check the Web Push configuration.",
        502,
      );
    }
    return ApiResponse.success(
      { accepted, failed, invalidDevices: invalidIds.length },
      failed ? "Test accepted on some devices." : "Test notification accepted by Apple.",
    );
  });
}
