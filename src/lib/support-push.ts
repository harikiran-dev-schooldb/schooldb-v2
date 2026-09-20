import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

import { prisma } from "@/lib/prisma";

const SUPPORT_APP = "SCHOOL_SUPPORT";

function firebaseApp() {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) return null;

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

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

  const app = firebaseApp();
  if (!app) {
    console.warn("Support push skipped: Firebase server credentials are not configured.");
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
  const tokens = devices.flatMap((device) => device.fcmToken ? [device.fcmToken] : []);
  if (!tokens.length) return;

  const response = await getMessaging(app).sendEachForMulticast({
    tokens,
    notification: { title: input.title, body: input.body },
    data: {
      type: "SUPPORT_TICKET",
      ticketId: input.ticketId,
      ticketNo: input.ticketNo,
    },
    android: {
      priority: "high",
      notification: { channelId: "support_tickets" },
    },
  });

  const invalidIds = response.responses.flatMap((result, index) => {
    if (result.success) return [];
    const code = result.error?.code ?? "";
    return code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token"
      ? [devices[index].id]
      : [];
  });
  if (invalidIds.length) {
    await prisma.pushDevice.updateMany({
      where: { id: { in: invalidIds } },
      data: { enabled: false },
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
