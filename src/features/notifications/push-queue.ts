import { prisma } from "@/lib/prisma";

import { sendAnnouncementPush } from "./push";

const MAX_PUSH_ATTEMPTS = 3;
const STALE_JOB_MS = 10 * 60 * 1000;
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000] as const;

type QueueableAnnouncement = {
  id: string;
  schoolId: string;
  publishedAt?: Date;
};

function retryAt(attempts: number, now = new Date()) {
  const delay = RETRY_DELAYS_MS[Math.min(Math.max(attempts - 1, 0), RETRY_DELAYS_MS.length - 1)];
  return new Date(now.getTime() + delay);
}

export async function queueAnnouncementPush(announcement: QueueableAnnouncement) {
  try {
    return await prisma.pushDeliveryJob.create({
      data: {
        schoolId: announcement.schoolId,
        announcementId: announcement.id,
        nextAttemptAt: announcement.publishedAt ?? new Date(),
      },
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return prisma.pushDeliveryJob.findUnique({
        where: { announcementId: announcement.id },
      });
    }
    throw error;
  }
}

export async function processPushDeliveryJob(jobId: string) {
  const now = new Date();
  const claimed = await prisma.pushDeliveryJob.updateMany({
    where: {
      id: jobId,
      status: { in: ["QUEUED", "FAILED"] },
      attempts: { lt: MAX_PUSH_ATTEMPTS },
      nextAttemptAt: { lte: now },
    },
    data: {
      status: "PROCESSING",
      attempts: { increment: 1 },
      startedAt: now,
      lastError: null,
    },
  });
  if (claimed.count !== 1) return null;

  const job = await prisma.pushDeliveryJob.findUnique({
    where: { id: jobId },
    include: { announcement: true },
  });
  if (!job) return null;

  try {
    const delivery = await sendAnnouncementPush(job.announcement);
    if (delivery.skipped) {
      throw new Error("Push provider delivery did not complete.");
    }
    await prisma.pushDeliveryJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        lastError: null,
      },
    });
    return delivery;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Push delivery failed";
    await prisma.pushDeliveryJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        nextAttemptAt: retryAt(job.attempts),
        lastError: message.slice(0, 1000),
      },
    });
    console.error("PUSH DELIVERY JOB FAILED", { jobId: job.id, error });
    return null;
  }
}

export async function deliverAnnouncementPushDurably(
  announcement: QueueableAnnouncement,
) {
  const job = await queueAnnouncementPush(announcement);
  if (!job || job.nextAttemptAt > new Date()) {
    return { sent: 0, failed: 0, skipped: false, queued: true };
  }
  const delivery = await processPushDeliveryJob(job.id);
  return delivery ?? { sent: 0, failed: 0, skipped: true, queued: true };
}

export async function processPendingPushDeliveries(limit = 20) {
  const staleBefore = new Date(Date.now() - STALE_JOB_MS);
  await prisma.pushDeliveryJob.updateMany({
    where: {
      status: "PROCESSING",
      startedAt: { lt: staleBefore },
      attempts: { lt: MAX_PUSH_ATTEMPTS },
    },
    data: {
      status: "QUEUED",
      nextAttemptAt: new Date(),
      lastError: "Recovered after an interrupted worker.",
    },
  });
  await prisma.pushDeliveryJob.updateMany({
    where: {
      status: "PROCESSING",
      startedAt: { lt: staleBefore },
      attempts: { gte: MAX_PUSH_ATTEMPTS },
    },
    data: {
      status: "FAILED",
      lastError: "Delivery worker was interrupted on its final attempt.",
    },
  });

  const jobs = await prisma.pushDeliveryJob.findMany({
    where: {
      status: { in: ["QUEUED", "FAILED"] },
      attempts: { lt: MAX_PUSH_ATTEMPTS },
      nextAttemptAt: { lte: new Date() },
    },
    orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
    take: limit,
    select: { id: true },
  });

  let completed = 0;
  for (const job of jobs) {
    const result = await processPushDeliveryJob(job.id);
    if (result && !result.skipped) completed += 1;
  }
  return { selected: jobs.length, completed };
}

export const pushDeliveryQueuePolicy = {
  maxAttempts: MAX_PUSH_ATTEMPTS,
  staleJobMs: STALE_JOB_MS,
  retryDelaysMs: RETRY_DELAYS_MS,
};
