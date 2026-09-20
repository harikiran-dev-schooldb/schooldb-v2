import { auth } from "@clerk/nextjs/server";

import { normalizeIndianMobile } from "@/features/auth/otp";
import { resolveAudience } from "@/features/audiences/resolve";
import type { AudienceType } from "@/features/audiences/types";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type CreateCampaignInput = {
  schoolId: string;
  createdBy: string;
  title: string;
  message: string;
  targetType: AudienceType;
  targetId: string;
  scheduledAt: Date;
  templateName: string;
  automatic?: boolean;
  automationKey?: string;
  sourceType?: string;
  sourceId?: string;
  studentIds?: string[];
  targetLabel?: string;
};

type WhatsappStudent = {
  id: string;
  fullName: string | null;
  admissionNo: string;
  phone: string | null;
  fatherPhone: string | null;
  motherPhone: string | null;
  guardianPhone: string | null;
};

async function resolveCreatorFullName(fallback: string) {
  try {
    const { userId } = await auth();
    if (!userId) return fallback;

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { firstName: true, lastName: true },
    });

    const fullName = [user?.firstName, user?.lastName]
      .filter((value): value is string => Boolean(value?.trim()))
      .map((value) => value.trim())
      .join(" ");

    return fullName || fallback;
  } catch {
    return fallback;
  }
}

function preferredPhone(student: {
  fatherPhone: string | null;
  motherPhone: string | null;
  guardianPhone: string | null;
  phone: string | null;
}) {
  for (const value of [student.fatherPhone, student.motherPhone, student.guardianPhone, student.phone]) {
    if (!value) continue;
    const phone = normalizeIndianMobile(value);
    if (phone) return phone;
  }
  return null;
}

function buildRecipients(students: WhatsappStudent[]) {
  const recipients = new Map<string, { studentId: string; recipientName: string; phone: string }>();
  for (const student of students) {
    const phone = preferredPhone(student);
    if (!phone || recipients.has(phone)) continue;
    recipients.set(phone, {
      studentId: student.id,
      recipientName: student.fullName || `Student ${student.admissionNo}`,
      phone,
    });
  }
  return recipients;
}

export async function getWhatsappEligibleRecipientCount(
  schoolId: string,
  targetType: AudienceType,
  targetId: string,
) {
  const enrollmentWhere = {
    schoolId,
    active: true,
    ...(targetType === "CLASS" ? { classId: targetId } : {}),
    ...(targetType === "SECTION" ? { sectionId: targetId } : {}),
  };

  const students = await prisma.student.findMany({
    where: {
      schoolId,
      status: "ACTIVE",
      whatsappOptIn: true,
      ...(targetType === "STUDENT"
        ? { id: targetId }
        : targetType === "SCHOOL"
          ? {}
          : { enrollments: { some: enrollmentWhere } }),
    },
    select: {
      id: true,
      fullName: true,
      admissionNo: true,
      phone: true,
      fatherPhone: true,
      motherPhone: true,
      guardianPhone: true,
    },
  });

  const recipients = buildRecipients(students);
  return { optedInStudents: students.length, eligibleRecipients: recipients.size };
}

export async function createWhatsappCampaign(input: CreateCampaignInput) {
  if (input.automationKey) {
    const existing = await prisma.whatsappCampaign.findFirst({
      where: { schoolId: input.schoolId, automationKey: input.automationKey },
      select: { id: true, recipientCount: true },
    });
    if (existing) return existing;
  }

  const audience = input.studentIds
    ? { targetId: input.targetId || null, targetLabel: input.targetLabel || "Automatic alert" }
    : await resolveAudience(input.schoolId, input.targetType, input.targetId);

  const enrollmentWhere = {
    schoolId: input.schoolId,
    active: true,
    ...(input.targetType === "CLASS" ? { classId: audience.targetId! } : {}),
    ...(input.targetType === "SECTION" ? { sectionId: audience.targetId! } : {}),
  };

  const students = await prisma.student.findMany({
    where: {
      schoolId: input.schoolId,
      status: "ACTIVE",
      whatsappOptIn: true,
      ...(input.studentIds
        ? { id: { in: input.studentIds } }
        : input.targetType === "STUDENT"
          ? { id: audience.targetId! }
          : { enrollments: { some: enrollmentWhere } }),
    },
    select: {
      id: true,
      fullName: true,
      admissionNo: true,
      phone: true,
      fatherPhone: true,
      motherPhone: true,
      guardianPhone: true,
    },
  });

  const recipients = buildRecipients(students);
  if (recipients.size === 0) {
    throw new Error("No WhatsApp-opted-in students with valid mobile numbers were found for this audience.");
  }

  const createdBy = await resolveCreatorFullName(input.createdBy);

  return prisma
    .$transaction(async (tx) => {
      const campaign = await tx.whatsappCampaign.create({
        data: {
          schoolId: input.schoolId,
          createdBy,
          title: input.title,
          message: input.message,
          templateName: input.templateName,
          targetType: input.targetType,
          targetId: audience.targetId,
          targetLabel: audience.targetLabel,
          scheduledAt: input.scheduledAt,
          recipientCount: recipients.size,
          automatic: input.automatic ?? false,
          automationKey: input.automationKey,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
        },
        select: { id: true },
      });

      await tx.whatsappRecipient.createMany({
        data: [...recipients.values()].map((recipient) => ({
          ...recipient,
          schoolId: input.schoolId,
          campaignId: campaign.id,
        })),
      });

      return { ...campaign, recipientCount: recipients.size };
    })
    .catch(async (error) => {
      if (
        input.automationKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return prisma.whatsappCampaign.findFirstOrThrow({
          where: { schoolId: input.schoolId, automationKey: input.automationKey },
          select: { id: true, recipientCount: true },
        });
      }
      throw error;
    });
}

type AutomatedAlertInput = {
  schoolId: string;
  automationKey: string;
  sourceType: "ATTENDANCE" | "HOMEWORK" | "RESULT" | "FEE_DUE" | "PROMOTION" | "BIRTHDAY";
  sourceId: string;
  title: string;
  message: string;
  studentIds: string[];
  targetLabel: string;
};

function automatedTemplateName(sourceType: AutomatedAlertInput["sourceType"]) {
  const templates: Record<AutomatedAlertInput["sourceType"], string | undefined> = {
    ATTENDANCE: process.env.META_WA_ATTENDANCE_TEMPLATE,
    HOMEWORK: process.env.META_WA_HOMEWORK_TEMPLATE,
    RESULT: process.env.META_WA_RESULT_TEMPLATE,
    FEE_DUE: process.env.META_WA_FEE_REMINDER_TEMPLATE,
    PROMOTION: process.env.META_WA_PROMOTION_TEMPLATE,
    BIRTHDAY: process.env.META_WA_BIRTHDAY_TEMPLATE,
  };
  return templates[sourceType] || process.env.META_WA_ANNOUNCEMENT_TEMPLATE;
}

export async function queueAutomatedWhatsappAlert(input: AutomatedAlertInput) {
  if (process.env.META_WA_AUTOMATION_ENABLED !== "true" || input.studentIds.length === 0) return null;

  const templateName = automatedTemplateName(input.sourceType);
  if (!templateName) {
    console.warn("[whatsapp-automation] Template is not configured", {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    });
    return null;
  }

  try {
    return await createWhatsappCampaign({
      schoolId: input.schoolId,
      createdBy: "SYSTEM",
      title: input.title,
      message: input.message,
      targetType: "SCHOOL",
      targetId: "",
      targetLabel: input.targetLabel,
      studentIds: [...new Set(input.studentIds)],
      scheduledAt: new Date(),
      templateName,
      automatic: true,
      automationKey: input.automationKey,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    });
  } catch (error) {
    console.error("[whatsapp-automation] Unable to queue alert", {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function queueAdmissionWhatsappUpdate(input: {
  schoolId: string;
  applicationId: string;
  applicationNo: string;
  studentName: string;
  phone: string | null;
  status: string;
  schoolName: string;
}) {
  if (process.env.META_WA_AUTOMATION_ENABLED !== "true" || !input.phone) return null;

  const phone = normalizeIndianMobile(input.phone);
  const templateName = process.env.META_WA_ADMISSION_TEMPLATE || process.env.META_WA_ANNOUNCEMENT_TEMPLATE;
  if (!phone || !templateName) return null;

  const statusLabel = input.status.replaceAll("_", " ").toLowerCase();
  const title = input.status === "SUBMITTED" ? "Admission application received" : "Admission application updated";
  const message = input.status === "SUBMITTED"
    ? `${input.schoolName} received ${input.studentName}'s application ${input.applicationNo}. Keep this number to track the application.`
    : `${input.studentName}'s application ${input.applicationNo} is now ${statusLabel}. Contact ${input.schoolName} if you need clarification.`;
  const automationKey = `admission:${input.applicationId}:${input.status}`;

  try {
    const existing = await prisma.whatsappCampaign.findFirst({
      where: { schoolId: input.schoolId, automationKey },
      select: { id: true },
    });
    if (existing) return existing;

    const campaign = await prisma.$transaction(async (tx) => {
      const created = await tx.whatsappCampaign.create({
        data: {
          schoolId: input.schoolId,
          title,
          message,
          templateName,
          targetType: "ADMISSION",
          targetId: input.applicationId,
          targetLabel: `${input.studentName} (${input.applicationNo})`,
          status: "QUEUED",
          recipientCount: 1,
          createdBy: "SYSTEM",
          scheduledAt: new Date(),
          automatic: true,
          automationKey,
          sourceType: "ADMISSION",
          sourceId: input.applicationId,
        },
        select: { id: true },
      });

      await tx.whatsappRecipient.create({
        data: {
          schoolId: input.schoolId,
          campaignId: created.id,
          recipientName: input.studentName,
          phone,
        },
      });
      return created;
    });

    await processWhatsappCampaignBatch(input.schoolId, campaign.id, 1);
    return campaign;
  } catch (error) {
    console.error("[admission-whatsapp] Unable to send update", {
      applicationId: input.applicationId,
      status: input.status,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function queueParentQueryWhatsappUpdate(input: {
  schoolId: string;
  ticketId: string;
  ticketNo: string;
  phone: string | null;
  parentName: string | null;
  status: string;
  eventKey: string;
}) {
  if (process.env.META_WA_AUTOMATION_ENABLED !== "true" || !input.phone) return null;

  const phone = normalizeIndianMobile(input.phone);
  const templateName = process.env.META_WA_PARENT_QUERY_TEMPLATE || process.env.META_WA_ANNOUNCEMENT_TEMPLATE;
  if (!phone || !templateName) return null;

  const statusText: Record<string, string> = {
    OPEN: "was received by the school",
    ASSIGNED: "has been assigned to the school team",
    IN_PROGRESS: "is being reviewed",
    WAITING: "is waiting for follow-up from the school",
    RESOLVED: "has been resolved",
    CLOSED: "has been closed",
    REOPENED: "has been reopened for further review",
  };
  const school = await prisma.school.findUnique({ where: { id: input.schoolId }, select: { name: true } });
  const title = input.status === "OPEN" ? "Parent query received" : `Parent query ${input.status.toLowerCase().replaceAll("_", " ")}`;
  const message = `${school?.name || "Your school"} query ${input.ticketNo} ${statusText[input.status] || `is ${input.status.toLowerCase()}`}. Keep this ticket number for follow-up.`;
  const automationKey = `parent-query:${input.ticketId}:${input.eventKey}`;

  try {
    const existing = await prisma.whatsappCampaign.findUnique({
      where: { schoolId_automationKey: { schoolId: input.schoolId, automationKey } },
      select: { id: true },
    });
    if (existing) return existing;

    const campaign = await prisma.$transaction(async (tx) => {
      const created = await tx.whatsappCampaign.create({
        data: {
          schoolId: input.schoolId,
          title,
          message,
          templateName,
          targetType: "PARENT_QUERY",
          targetId: input.ticketId,
          targetLabel: input.ticketNo,
          status: "QUEUED",
          recipientCount: 1,
          createdBy: "SYSTEM",
          scheduledAt: new Date(),
          automatic: true,
          automationKey,
          sourceType: "PARENT_QUERY",
          sourceId: input.ticketId,
        },
        select: { id: true },
      });
      await tx.whatsappRecipient.create({
        data: {
          schoolId: input.schoolId,
          campaignId: created.id,
          recipientName: input.parentName || "Parent",
          phone,
        },
      });
      return created;
    });

    await processWhatsappCampaignBatch(input.schoolId, campaign.id, 1);
    return campaign;
  } catch (error) {
    console.error("[parent-query-whatsapp] Unable to send update", {
      ticketId: input.ticketId,
      status: input.status,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function templateParameterText(value: string) {
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

async function sendTemplate(phone: string, templateName: string, title: string, message: string) {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WA_TOKEN;
  if (!phoneNumberId || !accessToken) throw new Error("WhatsApp Cloud API is not configured.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const apiVersion = process.env.META_WA_API_VERSION || "v22.0";
    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: `91${phone}`,
        type: "template",
        template: {
          name: templateName,
          language: { code: process.env.META_WA_ANNOUNCEMENT_LANGUAGE || "en" },
          components: [{
            type: "body",
            parameters: [
              { type: "text", text: templateParameterText(title) },
              { type: "text", text: templateParameterText(message) },
            ],
          }],
        },
      }),
    });

    const data = (await response.json()) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string; error_data?: { details?: string } };
    };
    if (!response.ok) {
      const providerError = [data.error?.message, data.error?.error_data?.details].filter(Boolean).join(" — ");
      throw new Error(providerError || "WhatsApp rejected the message.");
    }
    return data.messages?.[0]?.id || null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function processWhatsappCampaignBatch(
  schoolId: string,
  campaignId: string,
  batchSize = 20,
) {
  const campaign = await prisma.whatsappCampaign.findFirst({
    where: {
      id: campaignId,
      schoolId,
      status: { notIn: ["CANCELLED", "COMPLETED"] },
      scheduledAt: { lte: new Date() },
    },
    select: { id: true, title: true, message: true, templateName: true },
  });
  if (!campaign) throw new Error("This campaign is unavailable or not ready to send.");

  const recipients = await prisma.whatsappRecipient.findMany({
    where: {
      campaignId,
      schoolId,
      status: { in: ["QUEUED", "FAILED"] },
      attempts: { lt: 3 },
    },
    orderBy: { createdAt: "asc" },
    take: batchSize,
    select: { id: true, phone: true },
  });
  if (recipients.length === 0) throw new Error("There are no queued messages ready to send.");

  await prisma.$transaction([
    prisma.whatsappCampaign.update({ where: { id: campaign.id }, data: { status: "SENDING" } }),
    prisma.whatsappRecipient.updateMany({
      where: { id: { in: recipients.map((recipient) => recipient.id) } },
      data: { status: "SENDING", lastAttemptAt: new Date(), attempts: { increment: 1 } },
    }),
  ]);

  const groups = Array.from(
    { length: Math.ceil(recipients.length / 5) },
    (_, index) => recipients.slice(index * 5, index * 5 + 5),
  );

  for (const group of groups) {
    await Promise.all(group.map(async (recipient) => {
      try {
        const providerMessageId = await sendTemplate(
          recipient.phone,
          campaign.templateName,
          campaign.title,
          campaign.message,
        );
        await prisma.whatsappRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "SENT",
            providerMessageId,
            sentAt: new Date(),
            deliveredAt: null,
            readAt: null,
            failedAt: null,
            providerStatusAt: null,
            errorMessage: null,
          },
        });
      } catch (error) {
        await prisma.whatsappRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "FAILED",
            failedAt: new Date(),
            errorMessage: (error instanceof Error ? error.message : "Delivery failed").slice(0, 500),
          },
        });
      }
    }));
  }

  const [sentCount, deliveredCount, readCount, failedCount, retryableCount] = await Promise.all([
    prisma.whatsappRecipient.count({ where: { campaignId, status: { in: ["SENT", "DELIVERED", "READ"] } } }),
    prisma.whatsappRecipient.count({ where: { campaignId, status: { in: ["DELIVERED", "READ"] } } }),
    prisma.whatsappRecipient.count({ where: { campaignId, status: "READ" } }),
    prisma.whatsappRecipient.count({ where: { campaignId, status: "FAILED" } }),
    prisma.whatsappRecipient.count({
      where: { campaignId, status: { in: ["QUEUED", "FAILED"] }, attempts: { lt: 3 } },
    }),
  ]);

  const status = retryableCount > 0
    ? "QUEUED"
    : failedCount === 0
      ? "COMPLETED"
      : sentCount === 0
        ? "FAILED"
        : "PARTIAL";

  await prisma.whatsappCampaign.update({
    where: { id: campaignId },
    data: {
      sentCount,
      deliveredCount,
      readCount,
      failedCount,
      status,
      completedAt: retryableCount === 0 ? new Date() : null,
    },
  });

  return { processed: recipients.length, sentCount, failedCount, remaining: retryableCount };
}
