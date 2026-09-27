import { mapWithConcurrency } from "@/features/notifications/batch";
import { notificationDedupeKey } from "@/features/notifications/dedupe";
import { sendAnnouncementPush } from "@/features/notifications/push";
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
                      fullName: true,
                      admissionNo: true,
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

  const students = new Map<string, { studentId: string; name: string }>();
  for (const row of rows) {
    const student = row.studentFeeItem.studentFee.studentEnrollment.student;
    if (!students.has(student.id)) {
      students.set(student.id, {
        studentId: student.id,
        name: student.fullName?.trim() || student.admissionNo,
      });
    }
  }

  const studentIds = [...students.keys()];
  const recentRecipients = studentIds.length
    ? await prisma.announcement.findMany({
        where: {
          schoolId,
          category: "FEE_REMINDER",
          targetType: "STUDENT",
          targetId: { in: studentIds },
          createdAt: {
            gte: new Date(now.getTime() - RECENT_REMINDER_WINDOW_MS),
          },
        },
        select: { targetId: true },
        distinct: ["targetId"],
      })
    : [];
  const recentlyRemindedIds = new Set(
    recentRecipients.flatMap((item) => item.targetId ? [item.targetId] : []),
  );
  const eligibleStudentIds = studentIds.filter(
    (studentId) => !recentlyRemindedIds.has(studentId),
  );
  const eligibleStudentIdSet = new Set(eligibleStudentIds);
  const eligibleRows = rows.filter((row) =>
    eligibleStudentIdSet.has(
      row.studentFeeItem.studentFee.studentEnrollment.student.id,
    ),
  );

  return {
    recipients: eligibleStudentIds.map((studentId) => students.get(studentId)!),
    installmentNames: [...new Set(eligibleRows.map((row) => row.name))],
    preview: {
      recipientCount: eligibleStudentIds.length,
      studentCount: studentIds.length,
      installmentCount: eligibleRows.length,
      outstandingAmount: eligibleRows.reduce(
        (total, row) =>
          total +
          Math.max(0, Number(row.payableAmount) - Number(row.paidAmount)),
        0,
      ),
      recentlyRemindedCount: recentlyRemindedIds.size,
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
        : "No students with overdue fees were found for the selected filters.",
    );
  }

  const message =
    audience.installmentNames.length === 1
      ? `${audience.installmentNames[0]} is overdue. Please review the outstanding fee in SchoolDB or contact the school office.`
      : "One or more fee installments are overdue. Please review outstanding fees in SchoolDB or contact the school office.";
  const reminderDate = indiaDateKey();
  const deliveries = await mapWithConcurrency(
    audience.recipients,
    10,
    async (recipient) => {
      try {
        const announcement = await prisma.announcement.create({
          data: {
            schoolId: input.schoolId,
            createdBy: input.createdBy,
            title: "Fee payment reminder",
            body: message,
            category: "FEE_REMINDER",
            priority: "IMPORTANT",
            targetType: "STUDENT",
            targetId: recipient.studentId,
            targetLabel: recipient.name,
            sourceType: "FEE_REMINDER",
            sourceId: recipient.studentId,
            dedupeKey: notificationDedupeKey.feeReminder(
              recipient.studentId,
              reminderDate,
            ),
            publishedAt: new Date(),
          },
        });
        const delivery = await sendAnnouncementPush(announcement);
        return {
          notificationId: announcement.id,
          sent: delivery.sent,
          failed: delivery.failed,
          processingFailed: false,
        };
      } catch (error) {
        console.error("Unable to process fee reminder notification.", {
          schoolId: input.schoolId,
          studentId: recipient.studentId,
          error,
        });
        return {
          notificationId: null,
          sent: 0,
          failed: 0,
          processingFailed: true,
        };
      }
    },
  );

  const notificationIds = deliveries.flatMap((item) =>
    item.notificationId ? [item.notificationId] : [],
  );
  const sentCount = deliveries.reduce((total, item) => total + item.sent, 0);
  const failedCount =
    deliveries.reduce((total, item) => total + item.failed, 0) +
    deliveries.filter((item) => item.processingFailed).length;

  return {
    notificationIds,
    recipientCount: audience.recipients.length,
    processed: deliveries.length,
    sentCount,
    failedCount,
    remaining: 0,
  };
}
