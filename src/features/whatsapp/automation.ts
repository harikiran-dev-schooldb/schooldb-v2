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

export async function queueHomeworkPublishedAlert(
  schoolId: string,
  homeworkId: string,
) {
  const homework = await prisma.homework.findFirst({
    where: { id: homeworkId, schoolId, active: true },
    select: {
      id: true,
      title: true,
      dueDate: true,
      academicYearId: true,
      classId: true,
      sectionId: true,
      class: { select: { name: true } },
      section: { select: { name: true } },
    },
  });
  if (!homework) return null;

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      schoolId,
      active: true,
      classId: homework.classId,
      ...(homework.sectionId ? { sectionId: homework.sectionId } : {}),
      ...(homework.academicYearId ? { academicYearId: homework.academicYearId } : {}),
    },
    select: { studentId: true },
  });
  const classLabel = `${homework.class.name}${homework.section ? ` — ${homework.section.name}` : ""}`;
  return queueAutomatedWhatsappAlert({
    schoolId,
    automationKey: `homework:${homework.id}:published`,
    sourceType: "HOMEWORK",
    sourceId: homework.id,
    title: "New homework",
    message: `${homework.title} was published for Class ${classLabel}${homework.dueDate ? ` and is due on ${formatDate(homework.dueDate)}` : ""}. Open SchoolDB to view the details.`,
    studentIds: enrollments.map((enrollment) => enrollment.studentId),
    targetLabel: `Class ${classLabel}`,
  });
}

export async function queueResultsPublishedAlert(
  schoolId: string,
  examId: string,
) {
  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId, status: "COMPLETED", active: true },
    select: {
      id: true,
      name: true,
      academicYearId: true,
      schedules: { select: { classId: true, sectionId: true } },
    },
  });
  if (!exam || exam.schedules.length === 0) return null;

  const scopes = [...new Map(
    exam.schedules.map((schedule) => [
      `${schedule.classId}:${schedule.sectionId || "all"}`,
      schedule,
    ]),
  ).values()];
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      schoolId,
      academicYearId: exam.academicYearId,
      active: true,
      OR: scopes.map((scope) => ({
        classId: scope.classId,
        ...(scope.sectionId ? { sectionId: scope.sectionId } : {}),
      })),
    },
    select: { studentId: true },
  });
  return queueAutomatedWhatsappAlert({
    schoolId,
    automationKey: `result:${exam.id}:published`,
    sourceType: "RESULT",
    sourceId: exam.id,
    title: "Results published",
    message: `${exam.name} results are now available. Sign in to SchoolDB to view the result and report card.`,
    studentIds: enrollments.map((enrollment) => enrollment.studentId),
    targetLabel: `${exam.name} students`,
  });
}

export async function queueDailyFeeDueAlerts(now = new Date()) {
  if (process.env.META_WA_AUTOMATION_ENABLED !== "true") return [];
  const dateKey = indiaDateKey(now);
  const today = new Date(`${dateKey}T00:00:00.000Z`);
  const overdue = await prisma.studentFeeInstallment.findMany({
    where: {
      dueDate: { lt: today },
      status: { in: ["PENDING", "PARTIAL"] },
      studentFeeItem: { studentFee: { active: true } },
    },
    select: {
      studentFeeItem: {
        select: {
          studentFee: {
            select: {
              schoolId: true,
              studentEnrollment: { select: { studentId: true } },
            },
          },
        },
      },
    },
  });

  const bySchool = new Map<string, Set<string>>();
  for (const installment of overdue) {
    const fee = installment.studentFeeItem.studentFee;
    const students = bySchool.get(fee.schoolId) ?? new Set<string>();
    students.add(fee.studentEnrollment.studentId);
    bySchool.set(fee.schoolId, students);
  }

  const queued = [];
  for (const [schoolId, studentIds] of bySchool) {
    const campaign = await queueAutomatedWhatsappAlert({
      schoolId,
      automationKey: `fee-due:${dateKey}`,
      sourceType: "FEE_DUE",
      sourceId: dateKey,
      title: "Fee payment reminder",
      message: "One or more fee installments are overdue. Please review outstanding fees in SchoolDB or contact the school office.",
      studentIds: [...studentIds],
      targetLabel: "Students with overdue fees",
    });
    if (campaign) queued.push(campaign);
  }
  return queued;
}

export async function processAutomatedCampaign(campaignId: string) {
  const campaign = await prisma.whatsappCampaign.findFirst({
    where: { id: campaignId, automatic: true, status: { in: ["QUEUED", "SENDING", "PARTIAL", "FAILED"] } },
    select: { id: true, schoolId: true },
  });
  if (!campaign) return null;
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
