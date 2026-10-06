import { firebaseMessaging } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";

const SUPPORT_APP = "SCHOOL_SUPPORT";

const INVALID_SUPPORT_REGISTRATION_CODES = new Set([
  "messaging/installation-id-not-registered",
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

export async function sendSupportPush(input: {
  schoolId: string;
  userIds: string[];
  excludeUserId?: string;
  title: string;
  body: string;
  ticketId: string;
  ticketNo: string;
}) {
  const userIds = [...new Set(input.userIds)].filter(
    (id) => id && id !== input.excludeUserId,
  );
  if (!userIds.length) return;

  const school = await prisma.school.findUnique({
    where: { id: input.schoolId },
    select: { slug: true },
  });
  if (!school) return;

  const messaging = firebaseMessaging();
  if (!messaging) {
    console.warn("Support push skipped: Firebase messaging is unavailable.");
    return;
  }

  const devices = await prisma.pushDevice.findMany({
    where: {
      schoolId: input.schoolId,
      userId: { in: userIds },
      app: SUPPORT_APP,
      enabled: true,
      fcmToken: { not: null },
    },
    select: { id: true, fcmToken: true },
  });
  const targets = devices.flatMap((device) =>
    device.fcmToken ? [{ id: device.id, fid: device.fcmToken }] : [],
  );
  if (!targets.length) {
    console.warn("Support push skipped: no registered support devices for recipients.");
    return;
  }

  const response = await messaging.sendEachForMulticast({
    fids: targets.map((target) => target.fid),
    data: {
      type: "SUPPORT_TICKET",
      schoolSlug: school.slug,
      title: input.title,
      body: input.body,
      ticketId: input.ticketId,
      ticketNo: input.ticketNo,
    },
    android: {
      priority: "high",
    },
  });

  const invalidIds: string[] = [];
  response.responses.forEach((result, index) => {
    if (result.success) return;

    const code = result.error?.code ?? "";
    const target = targets[index];

    if (target && INVALID_SUPPORT_REGISTRATION_CODES.has(code)) {
      invalidIds.push(target.id);
      console.warn("Support push registration is stale; disabling device.", {
        code,
        ticketId: input.ticketId,
        deviceId: target.id,
      });
      return;
    }

    console.error("Support push delivery failed", {
      code,
      ticketId: input.ticketId,
      deviceId: target?.id,
    });
  });

  if (invalidIds.length) {
    await prisma.pushDevice.updateMany({
      where: { id: { in: invalidIds } },
      data: {
        enabled: false,
        fcmToken: null,
      },
    });
  }
}

export async function supportAdminUserIds(schoolId: string) {
  const memberships = await prisma.membership.findMany({
    where: {
      schoolId,
      isActive: true,
      role: { in: ["SUPER_ADMIN", "SCHOOL_ADMIN"] },
    },
    select: { userId: true },
  });
  return memberships.map((membership) => membership.userId);
}
