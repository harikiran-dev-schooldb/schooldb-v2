import { randomUUID } from "node:crypto";

import { normalizeIndianMobile } from "@/features/auth/otp";
import {
  createWhatsappCampaign,
  processWhatsappCampaignBatch,
} from "@/features/whatsapp/service";
import { prisma } from "@/lib/prisma";

export type FeeReminderFilters = {
  search?: string;
  classId?: string;
  sectionId?: string;
  academicYearId?: string;
};

export type FeeReminderPreview = {
  recipientCount: number;
  studentCount: number;
  installmentCount: number;
  outstandingAmount: number;
  recentlyRemindedCount: number;
};

const RECENT_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

function indiaDateKey(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

function preferredPhone(student: {
  fatherPhone: string | null;
  motherPhone: string | null;
  guardianPhone: string | null;
  phone: string | null;
}) {
  for (const value of [
    student.fatherPhone,
    student.motherPhone,
    student.guardianPhone,
    student.phone,
  ]) {
    if (!value) continue;
    const phone = normalizeIndianMobile(value);
    if (phone) return phone;
  }
  return null;
}

async function resolveFeeReminderAudience(
  schoolId: string,
  filters: FeeReminderFilters,
  now = new Date(),
) {
  const today = new Date(`${indiaDateKey(now)}T00:00:00.000Z`);
  const rows = await prisma.studentFeeInstallment.findMany({
    where: {
      dueDate: { lt: today },
      status: { in: ["PENDING", "PARTIAL"] },
      studentFeeItem: {
        studentFee: {
          schoolId,
          active: true,
          ...(filters.academicYearId
            ? { feePlan: { academicYearId: filters.academicYearId } }
            : {}),
          studentEnrollment: {
            active: true,
            ...(filters.classId ? { classId: filters.classId } : {}),
            ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
            student: {
              status: "ACTIVE",
              whatsappOptIn: true,
              ...(filters.search
                ? {
                    OR: [
                      {
                        fullName: {
                          contains: filters.search,
                          mode: "insensitive" as const,
                        },
                      },
                      {
                        admissionNo: {
                          contains: filters.search,
                          mode: "insensitive" as const,
                        },
                      },
                    ],
                  }
                : {}),
            },
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      payableAmount: true,
      paidAmount: true,
      studentFeeItem: {
        select: {
          studentFee: {
            select: {
              studentEnrollment: {
                select: {
                  student: {
                    select: {
                      id: true,
                      phone: true,
                      fatherPhone: true,
                      motherPhone: true,
                      guardianPhone: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const byPhone = new Map<string, { studentId: string }>();
  const studentIds = new Set<string>();
  for (const row of rows) {
    const student = row.studentFeeItem.studentFee.studentEnrollment.student;
    const phone = preferredPhone(student);
    if (!phone) continue;
    studentIds.add(student.id);
    if (!byPhone.has(phone)) byPhone.set(phone, { studentId: student.id });
  }

  const phones = [...byPhone.keys()];
  const recentRecipients = phones.length
    ? await prisma.whatsappRecipient.findMany({
        where: {
          schoolId,
          phone: { in: phones },
          createdAt: {
            gte: new Date(now.getTime() - RECENT_REMINDER_WINDOW_MS),
          },
          status: { in: ["SENT", "DELIVERED", "READ"] },
          campaign: { sourceType: "FEE_DUE" },
        },
        select: { phone: true },
        distinct: ["phone"],
      })
    : [];
  const recentPhones = new Set(recentRecipients.map((item) => item.phone));
  const eligiblePhones = phones.filter((phone) => !recentPhones.has(phone));
  const eligibleStudentIds = eligiblePhones.map(
    (phone) => byPhone.get(phone)!.studentId,
  );
  const eligibleStudentIdSet = new Set(eligibleStudentIds);
  const eligibleRows = rows.filter((row) =>
    eligibleStudentIdSet.has(
      row.studentFeeItem.studentFee.studentEnrollment.student.id,
    ),
  );

  return {
    studentIds: eligibleStudentIds,
    installmentNames: [...new Set(eligibleRows.map((row) => row.name))],
    preview: {
      recipientCount: eligiblePhones.length,
      studentCount: studentIds.size,
      installmentCount: eligibleRows.length,
      outstandingAmount: eligibleRows.reduce(
        (total, row) =>
          total +
          Math.max(0, Number(row.payableAmount) - Number(row.paidAmount)),
        0,
      ),
      recentlyRemindedCount: recentPhones.size,
    } satisfies FeeReminderPreview,
  };
}

export async function previewManualFeeReminders(
  schoolId: string,
  filters: FeeReminderFilters,
) {
  const result = await resolveFeeReminderAudience(schoolId, filters);
  return result.preview;
}

export async function sendManualFeeReminders(input: {
  schoolId: string;
  createdBy: string;
  filters: FeeReminderFilters;
}) {
  const audience = await resolveFeeReminderAudience(
    input.schoolId,
    input.filters,
  );
  if (audience.preview.recipientCount === 0) {
    throw new Error(
      audience.preview.recentlyRemindedCount > 0
        ? "All eligible recipients were reminded within the last 24 hours."
        : "No overdue students with WhatsApp consent and a valid mobile number were found.",
    );
  }

  const templateName =
    process.env.META_WA_FEE_REMINDER_TEMPLATE ||
    process.env.META_WA_ANNOUNCEMENT_TEMPLATE;
  if (!templateName) {
    throw new Error("The WhatsApp fee-reminder template is not configured.");
  }

  const message =
    audience.installmentNames.length === 1
      ? `${audience.installmentNames[0]} is overdue. Please review the outstanding fee in SchoolDB or contact the school office.`
      : "One or more fee installments are overdue. Please review outstanding fees in SchoolDB or contact the school office.";
  const reminderId = randomUUID();
  const campaign = await createWhatsappCampaign({
    schoolId: input.schoolId,
    createdBy: input.createdBy,
    title: "Fee payment reminder",
    message,
    targetType: "SCHOOL",
    targetId: "",
    targetLabel: "Filtered students with overdue fees",
    studentIds: audience.studentIds,
    scheduledAt: new Date(),
    templateName,
    automatic: true,
    automationKey: `fee-due:manual:${reminderId}`,
    sourceType: "FEE_DUE",
    sourceId: reminderId,
  });
  const delivery = await processWhatsappCampaignBatch(
    input.schoolId,
    campaign.id,
  );

  return {
    campaignId: campaign.id,
    recipientCount: campaign.recipientCount,
    ...delivery,
  };
}
