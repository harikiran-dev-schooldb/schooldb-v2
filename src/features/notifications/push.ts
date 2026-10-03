import type { Message } from "firebase-admin/messaging";

import { sendApnsPush } from "@/lib/apns";
import { firebaseMessaging } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import {
  isExpiredWebPushError,
  parseStoredWebPushSubscription,
  sendStandardWebPush,
  standardWebPushConfigured,
} from "@/lib/web-push";
import { mapWithConcurrency } from "./batch";
import { notificationEnabled } from "./preferences";

type PushAnnouncement = {
  id: string;
  schoolId: string;
  title: string;
  body: string;
  category: string;
  priority: string;
  targetType: string;
  targetId: string | null;
};

async function audienceUserIds(announcement: PushAnnouncement) {
  if (announcement.targetType === "ADMIN") {
    const memberships = await prisma.membership.findMany({
      where: {
        schoolId: announcement.schoolId,
        isActive: true,
        role: { in: ["SUPER_ADMIN", "SCHOOL_ADMIN"] },
      },
      select: { userId: true },
    });
    return memberships.map((membership) => membership.userId);
  }

  if (announcement.targetType === "SCHOOL") {
    const memberships = await prisma.membership.findMany({
      where: { schoolId: announcement.schoolId, isActive: true },
      select: { userId: true },
    });
    return memberships.map((membership) => membership.userId);
  }

  if (!announcement.targetId) return [];
  const enrollmentWhere = announcement.targetType === "SYLLABUS"
    ? { class: { branch: { syllabusId: announcement.targetId } } }
    : announcement.targetType === "BRANCH"
      ? { class: { branchId: announcement.targetId } }
      : announcement.targetType === "CLASS"
        ? { classId: announcement.targetId }
        : announcement.targetType === "SECTION"
          ? { sectionId: announcement.targetId }
          : undefined;
  const students = await prisma.student.findMany({
    where: {
      schoolId: announcement.schoolId,
      status: "ACTIVE",
      ...(announcement.targetType === "STUDENT"
        ? { id: announcement.targetId }
        : { enrollments: { some: { active: true, ...enrollmentWhere } } }),
    },
    select: {
      clerkId: true,
      parentLinks: {
        where: { schoolId: announcement.schoolId, active: true },
        select: { parentUserId: true },
      },
    },
  });
  const teacherClerkIds = announcement.targetType === "STUDENT"
    ? []
    : (await prisma.teacher.findMany({
        where: {
          schoolId: announcement.schoolId,
          active: true,
          allocations: { some: { active: true, ...enrollmentWhere } },
        },
        select: { clerkId: true },
      })).flatMap((teacher) => teacher.clerkId ? [teacher.clerkId] : []);
  const clerkIds = [
    ...students.flatMap((student) => student.clerkId ? [student.clerkId] : []),
    ...teacherClerkIds,
  ];
  const directUsers = clerkIds.length
    ? await prisma.user.findMany({
        where: { clerkUserId: { in: clerkIds } },
        select: { id: true },
      })
    : [];
  return Array.from(new Set([
    ...students.flatMap((student) => student.parentLinks.map((link) => link.parentUserId)),
    ...directUsers.map((user) => user.id),
  ]));
}

export async function sendAnnouncementPush(announcement: PushAnnouncement) {
  try {
    const userIds = await audienceUserIds(announcement);
    if (userIds.length === 0) return { sent: 0, failed: 0, skipped: false };

    const [preferences, school] = await Promise.all([
      prisma.notificationPreference.findMany({
        where: { schoolId: announcement.schoolId, userId: { in: userIds } },
        select: {
          userId: true,
          announcements: true,
          homework: true,
          attendance: true,
          fees: true,
          exams: true,
          leaveUpdates: true,
          urgent: true,
        },
      }),
      prisma.school.findUnique({
        where: { id: announcement.schoolId },
        select: { slug: true },
      }),
    ]);
    const preferencesByUser = new Map(preferences.map((item) => [item.userId, item]));
    const enabledUserIds = userIds.filter((userId) =>
      notificationEnabled(
        preferencesByUser.get(userId),
        announcement.category,
        announcement.priority,
      ),
    );
    const devices = enabledUserIds.length
      ? await prisma.pushDevice.findMany({
          where: {
            schoolId: announcement.schoolId,
            userId: { in: enabledUserIds },
            enabled: true,
          },
          select: {
            id: true,
            installationId: true,
            fcmToken: true,
            webPushSubscription: true,
            platform: true,
          },
        })
      : [];

    const notificationBody = announcement.body.length > 500
      ? `${announcement.body.slice(0, 499)}…`
      : announcement.body;
    const data = {
      announcementId: announcement.id,
      schoolId: announcement.schoolId,
      category: announcement.category,
      priority: announcement.priority,
      link: school ? `/${school.slug}/notifications/open?announcementId=${encodeURIComponent(announcement.id)}` : "/",
    };

    let sent = 0;
    let failed = 0;
    const invalidDeviceIds: string[] = [];

    const iosDevices = devices.filter((device) => device.platform === "IOS");
    if (iosDevices.length) {
      const apns = await sendApnsPush(
        iosDevices.map((device) => device.installationId),
        {
          title: announcement.title,
          body: notificationBody,
          data,
          collapseId: `announcement-${announcement.id}`,
        },
      );
      sent += apns.sent;
      failed += apns.failed;
      const invalidTokens = new Set(apns.invalidTokens);
      invalidDeviceIds.push(
        ...iosDevices.filter((device) => invalidTokens.has(device.installationId)).map((device) => device.id),
      );
    }

    const standardWebDevices = devices.flatMap((device) => {
      if (device.platform !== "WEB") return [];
      const subscription = parseStoredWebPushSubscription(device.webPushSubscription);
      return subscription ? [{ ...device, subscription }] : [];
    });
    if (standardWebDevices.length && standardWebPushConfigured()) {
      const origin = process.env.NEXT_PUBLIC_BASE_URL || "https://schooldb.co.in";
      const link = new URL(data.link, origin).href;
      const results = await mapWithConcurrency(
        standardWebDevices,
        20,
        async (device) => {
          try {
            await sendStandardWebPush(device.subscription, {
              title: announcement.title,
              body: notificationBody,
              link,
              tag: `announcement-${announcement.id}`,
              data,
            });
            return { status: "fulfilled" as const };
          } catch (reason) {
            return { status: "rejected" as const, reason };
          }
        },
      );
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          sent += 1;
          return;
        }
        failed += 1;
        if (isExpiredWebPushError(result.reason)) {
          invalidDeviceIds.push(standardWebDevices[index].id);
        } else {
          console.error("Standards-based Web Push delivery failed", result.reason);
        }
      });
    } else if (standardWebDevices.length) {
      failed += standardWebDevices.length;
      console.warn("Standards-based Web Push skipped: VAPID credentials are unavailable.");
    }

    const standardWebDeviceIds = new Set(standardWebDevices.map((device) => device.id));
    const firebaseDevices = devices.filter(
      (device) => device.platform !== "IOS"
        && !standardWebDeviceIds.has(device.id)
        && (device.platform !== "WEB" || Boolean(device.fcmToken)),
    );
    const messaging = firebaseMessaging();
    if (firebaseDevices.length && messaging) {
      for (let offset = 0; offset < firebaseDevices.length; offset += 500) {
        const chunk = firebaseDevices.slice(offset, offset + 500);
        const messages: Message[] = chunk.map((device) => {
          if (device.platform === "WEB" && device.fcmToken) {
            return {
              token: device.fcmToken,
              notification: { title: announcement.title, body: notificationBody },
              data,
              webpush: {
                notification: {
                  icon: "/pwa-192.png",
                  badge: "/pwa-192.png",
                  tag: `announcement-${announcement.id}`,
                },
                fcmOptions: { link: data.link },
              },
            };
          }
          return {
            fid: device.installationId,
            notification: { title: announcement.title, body: notificationBody },
            data,
            android: {
              priority: announcement.priority === "URGENT" ? "high" : "normal",
              notification: { channelId: "school_updates", sound: "default" },
            },
          };
        });
        const result = await messaging.sendEach(messages);
        sent += result.successCount;
        failed += result.failureCount;
        result.responses.forEach((response, index) => {
          if (response.success) return;
          if ([
            "messaging/registration-token-not-registered",
            "messaging/invalid-registration-token",
            "messaging/installation-id-not-registered",
          ].includes(response.error?.code ?? "")) {
            invalidDeviceIds.push(chunk[index].id);
          }
        });
      }
    } else if (firebaseDevices.length) {
      failed += firebaseDevices.length;
      console.warn("Firebase push skipped: provider credentials are unavailable.");
    }

    if (invalidDeviceIds.length > 0) {
      await prisma.pushDevice.updateMany({
        where: { id: { in: [...new Set(invalidDeviceIds)] } },
        data: { enabled: false },
      });
    }

    console.info("Announcement push delivery completed", {
      announcementId: announcement.id,
      audienceUsers: userIds.length,
      preferenceEnabledUsers: enabledUserIds.length,
      eligibleDevices: devices.length,
      iosDevices: iosDevices.length,
      standardWebDevices: standardWebDevices.length,
      firebaseDevices: firebaseDevices.length,
      sent,
      failed,
      invalidDevices: invalidDeviceIds.length,
    });
    return { sent, failed, skipped: false };
  } catch (error) {
    console.error("Unable to deliver announcement push notifications", error);
    return { sent: 0, failed: 0, skipped: true };
  }
}
