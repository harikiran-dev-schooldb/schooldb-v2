import { prisma } from "@/lib/prisma";

import {
  processWhatsappCampaignBatch,
  queueAutomatedWhatsappAlert,
} from "./service";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

function indiaDateKey(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

export async function queueAttendanceSessionAlert(
  schoolId: string,
  sessionId: string,
) {
  const session = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, schoolId, locked: true },
    select: {
      id: true,
      attendanceDate: true,
      sessionType: true,
      class: { select: { name: true } },
      section: { select: { name: true } },
      period: { select: { name: true } },
      records: {
        where: { status: "ABSENT" },
        select: { studentId: true },
      },
    },
  });
  if (!session || session.records.length === 0) return null;

  const sessionLabel = session.period?.name || session.sessionType?.toLowerCase() || "attendance";
  return queueAutomatedWhatsappAlert({
    schoolId,
    automationKey: `attendance:${session.id}`,
    sourceType: "ATTENDANCE",
    sourceId: session.id,
    title: "Attendance alert",
    message: `Your student was marked absent on ${formatDate(session.attendanceDate)} for Class ${session.class.name} — ${session.section.name} (${sessionLabel}).`,
    studentIds: session.records.map((record) => record.studentId),
    targetLabel: `${session.class.name} — ${session.section.name} absentees`,
  });
}

export async function queueDailyBirthdayWishes(now = new Date()) {
  const dateKey = indiaDateKey(now);
  const [, month, day] = dateKey.split("-").map(Number);

  const students = await prisma.student.findMany({
    where: {
      status: "ACTIVE",
      enrollments: { some: { active: true } },
    },
    select: {
      id: true,
      schoolId: true,
      fullName: true,
      dob: true,
      whatsappOptIn: true,
    },
  });

  const birthdays = students.filter((student) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      month: "numeric",
      day: "numeric",
      timeZone: "Asia/Kolkata",
    }).formatToParts(student.dob);
    const dobMonth = Number(parts.find((part) => part.type === "month")?.value);
    const dobDay = Number(parts.find((part) => part.type === "day")?.value);
    return dobMonth === month && dobDay === day;
  });

  const queued = [];
  for (const student of birthdays) {
    const name = student.fullName?.trim() || "Student";
    const message = `Happy Birthday, ${name}! 🎉 Wishing you a wonderful year filled with happiness, good health, learning and success. Best wishes from your school.`;

    if (
      process.env.META_WA_AUTOMATION_ENABLED === "true" &&
      student.whatsappOptIn
    ) {
      const campaign = await queueAutomatedWhatsappAlert({
        schoolId: student.schoolId,
        automationKey: `birthday:${student.id}:${dateKey}`,
        sourceType: "BIRTHDAY",
        sourceId: student.id,
        title: "Birthday wishes",
        message,
        studentIds: [student.id],
        targetLabel: `${name} — Birthday`,
      });
      if (campaign) queued.push(campaign);
    }
  }

  return queued;
}

export async function processAutomatedCampaign(campaignId: string) {
  const campaign = await prisma.whatsappCampaign.findFirst({
    where: { id: campaignId, automatic: true, status: { in: ["QUEUED", "SENDING", "PARTIAL", "FAILED"] } },
    select: { id: true, schoolId: true, sourceType: true },
  });
  if (!campaign) return null;
  if (["HOMEWORK", "RESULT", "FEE_DUE"].includes(campaign.sourceType ?? "")) {
    await prisma.$transaction([
      prisma.whatsappCampaign.update({
        where: { id: campaign.id },
        data: { status: "CANCELLED" },
      }),
      prisma.whatsappRecipient.updateMany({
        where: {
          campaignId: campaign.id,
          status: { in: ["QUEUED", "SENDING", "FAILED"] },
        },
        data: { status: "CANCELLED" },
      }),
    ]);
    return null;
  }
  try {
    return await processWhatsappCampaignBatch(campaign.schoolId, campaign.id);
  } catch (error) {
    console.error("[whatsapp-automation] Delivery attempt failed", {
      campaignId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function processReadyAutomatedCampaigns() {
  const campaigns = await prisma.whatsappCampaign.findMany({
    where: {
      automatic: true,
      status: { in: ["QUEUED", "SENDING", "PARTIAL", "FAILED"] },
      scheduledAt: { lte: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
    take: 10,
    select: { id: true },
  });
  const results = [];
  for (const campaign of campaigns) {
    results.push(await processAutomatedCampaign(campaign.id));
  }
  return results;
}
