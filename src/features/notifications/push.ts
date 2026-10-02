import type { Message } from "firebase-admin/messaging";

import { firebaseMessaging } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";

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
  const messaging = firebaseMessaging();
  if (!messaging) return { sent: 0, failed: 0, skipped: true };

  try {
    const userIds = await audienceUserIds(announcement);
    if (userIds.length === 0) return { sent: 0, failed: 0, skipped: false };
    const [devices, school] = await Promise.all([
      prisma.pushDevice.findMany({
        where: {
          schoolId: announcement.schoolId,
          userId: { in: userIds },
          enabled: true,
        },
        select: {
          id: true,
          installationId: true,
          fcmToken: true,
          platform: true,
        },
      }),
      prisma.school.findUnique({
        where: { id: announcement.schoolId },
        select: { slug: true },
      }),
    ]);

    let sent = 0;
    let failed = 0;
    const invalidDeviceIds: string[] = [];
    for (let offset = 0; offset < devices.length; offset += 500) {
      const chunk = devices.slice(offset, offset + 500);
      const notificationBody = announcement.body.length > 500
        ? `${announcement.body.slice(0, 499)}…`
        : announcement.body;
      const firebaseDevices = chunk.filter((device) => device.platform !== "IOS");
      const iosDevices = chunk.filter((device) => device.platform === "IOS");
      // Native iOS devices are registered now, but APNs delivery is intentionally
      // excluded from Firebase sends until the APNs provider is configured.
      // This prevents raw APNs tokens from being treated as Firebase installation IDs.
      if (iosDevices.length > 0) {
        console.info("APNs devices awaiting provider configuration", { count: iosDevices.length });
      }
      const messages: Message[] = firebaseDevices.map((device) => {
        const data = {
          announcementId: announcement.id,
          schoolId: announcement.schoolId,
          category: announcement.category,
          priority: announcement.priority,
          link: school ? `/${school.slug}/notifications/open` : "/",
        };
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
      if (messages.length === 0) continue;
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
          invalidDeviceIds.push(firebaseDevices[index].id);
        }
      });
    }
    if (invalidDeviceIds.length > 0) {
      await prisma.pushDevice.updateMany({
        where: { id: { in: invalidDeviceIds } },
        data: { enabled: false },
      });
    }
    console.info("Announcement push delivery completed", {
      announcementId: announcement.id,
      audienceUsers: userIds.length,
      eligibleDevices: devices.length,
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
