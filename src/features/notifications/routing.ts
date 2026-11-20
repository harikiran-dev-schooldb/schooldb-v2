import type { Message } from "firebase-admin/messaging";

export const SCHOOLDB_PUSH_APP = "SCHOOLDB";

export function supportNotificationPriority(priority: string) {
  return priority.toUpperCase() === "URGENT" ? "URGENT" as const : "NORMAL" as const;
}

export function schoolDbFirebaseMessage(
  device: {
    installationId: string;
    fcmToken: string | null;
    platform: string;
    userId: string;
  },
  data: Record<string, string>,
): Message {
  const scopedData = { ...data, recipientUserId: device.userId };
  if (device.platform === "WEB" && device.fcmToken) {
    return {
      token: device.fcmToken,
      data: scopedData,
      webpush: { fcmOptions: { link: data.link } },
    };
  }

  const urgent = data.priority === "URGENT";
  return {
    fid: device.installationId,
    data: scopedData,
    android: {
      priority: urgent ? "high" : "normal",
      collapseKey: `announcement-${data.announcementId}`,
    },
  };
}
