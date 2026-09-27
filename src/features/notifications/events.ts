import { prisma } from "@/lib/prisma";
import { sendAnnouncementPush } from "./push";
import { notificationDedupeKey } from "./dedupe";

async function createEventNotification(input: {
  schoolId: string;
  title: string;
  body: string;
  category: string;
  targetType: "SCHOOL" | "CLASS" | "SECTION" | "STUDENT" | "ADMIN";
  targetId: string | null;
  targetLabel: string;
  sourceType?: string;
  sourceId?: string;
  dedupeKey?: string;
}) {
  if (input.dedupeKey) {
    const existing = await prisma.announcement.findUnique({
      where: { dedupeKey: input.dedupeKey },
    });
    if (existing) return existing;
  }

  try {
    const announcement = await prisma.announcement.create({
      data: {
        ...input,
        priority: "NORMAL",
        createdBy: "SYSTEM",
        publishedAt: new Date(),
      },
    });
    await sendAnnouncementPush(announcement);
    return announcement;
  } catch (error) {
    if (
      input.dedupeKey &&
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const duplicate = await prisma.announcement.findUnique({
        where: { dedupeKey: input.dedupeKey },
      });
      if (duplicate) return duplicate;
    }
    throw error;
  }
}

function indiaDateKey(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

function indiaDayBounds(value = new Date()) {
  const [year, month, day] = indiaDateKey(value).split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day) - 5.5 * 60 * 60 * 1000);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

export async function notifyHomeworkPublished(homeworkId: string, schoolId: string) {
  const homework = await prisma.homework.findFirst({
    where: { id: homeworkId, schoolId, active: true },
    select: {
      id: true,
      title: true,
      assignedDate: true,
      dueDate: true,
      classId: true,
      sectionId: true,
      class: { select: { name: true } },
      section: { select: { name: true } },
      subject: { select: { name: true } },
    },
  });
  if (!homework) return null;

  const targetType = homework.sectionId ? "SECTION" : "CLASS";
  const targetId = homework.sectionId ?? homework.classId;
  const targetLabel = homework.section
    ? `${homework.class.name} - ${homework.section.name}`
    : homework.class.name;
  const title = `New homework: ${homework.title}`;
  const body = [
    homework.subject?.name,
    homework.dueDate ? `Due ${formatDate(homework.dueDate)}` : null,
  ].filter(Boolean).join(" · ") || "Open SchoolDB to view the homework.";

  const existing = await prisma.announcement.findFirst({
    where: {
      schoolId,
      category: "HOMEWORK",
      targetType,
      targetId,
      title,
      body,
      createdBy: "SYSTEM",
      publishedAt: { gte: homework.assignedDate },
    },
    select: { id: true },
  });
  if (existing) return existing;

  return createEventNotification({
    schoolId,
    title,
    body,
    category: "HOMEWORK",
    targetType,
    targetId,
    targetLabel,
    sourceType: "HOMEWORK",
    sourceId: homework.id,
    dedupeKey: notificationDedupeKey.homeworkPublished(homework.id),
  });
}

export async function notifyExamResultsPublished(examId: string, schoolId: string) {
  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId, status: "COMPLETED", active: true },
    select: {
      name: true,
      schedules: {
        select: {
          classId: true,
          sectionId: true,
          class: { select: { name: true } },
          section: { select: { name: true } },
        },
      },
    },
  });
  if (!exam) return [];

  const scopes = [...new Map(exam.schedules.map((schedule) => [
    `${schedule.classId}:${schedule.sectionId ?? "all"}`,
    schedule,
  ])).values()];
  const notifications = [];
  for (const scope of scopes) {
    const targetType = scope.sectionId ? "SECTION" : "CLASS";
    const targetId = scope.sectionId ?? scope.classId;
    const targetLabel = scope.section
      ? `${scope.class.name} - ${scope.section.name}`
      : scope.class.name;
    const title = `${exam.name} results published`;
    const body = "Results are now available. Open SchoolDB to view the result and report card.";
    const existing = await prisma.announcement.findFirst({
      where: {
        schoolId,
        category: "EXAM",
        targetType,
        targetId,
        title,
        createdBy: "SYSTEM",
      },
      select: { id: true },
    });
    if (existing) {
      notifications.push(existing);
      continue;
    }
    notifications.push(await createEventNotification({
      schoolId,
      title,
      body,
      category: "EXAM",
      targetType,
      targetId,
      targetLabel,
      sourceType: "EXAM",
      sourceId: examId,
      dedupeKey: notificationDedupeKey.examResultsPublished(
        examId,
        targetType,
        targetId,
      ),
    }));
  }
  return notifications;
}

export async function notifyDailyBirthdays(now = new Date()) {
  const dateKey = indiaDateKey(now);
  const [, month, day] = dateKey.split("-").map(Number);
  const { start, end } = indiaDayBounds(now);
  const students = await prisma.student.findMany({
    where: { status: "ACTIVE", enrollments: { some: { active: true } } },
    select: { id: true, schoolId: true, fullName: true, admissionNo: true, dob: true },
  });
  const birthdays = students.filter((student) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      month: "numeric",
      day: "numeric",
      timeZone: "Asia/Kolkata",
    }).formatToParts(student.dob);
    return Number(parts.find((part) => part.type === "month")?.value) === month
      && Number(parts.find((part) => part.type === "day")?.value) === day;
  });

  let created = 0;
  for (const student of birthdays) {
    const existing = await prisma.announcement.findFirst({
      where: {
        schoolId: student.schoolId,
        category: "BIRTHDAY",
        targetType: "STUDENT",
        targetId: student.id,
        createdAt: { gte: start, lt: end },
      },
      select: { id: true },
    });
    if (existing) continue;
    const name = student.fullName?.trim() || student.admissionNo;
    await createEventNotification({
      schoolId: student.schoolId,
      title: "🎂 Happy Birthday!",
      body: `Happy Birthday, ${name}! 🎉 Wishing you happiness, good health, learning and success. Best wishes from your school.`,
      category: "BIRTHDAY",
      targetType: "STUDENT",
      targetId: student.id,
      targetLabel: name,
      sourceType: "BIRTHDAY",
      sourceId: student.id,
      dedupeKey: notificationDedupeKey.birthday(student.id, dateKey),
    });
    created += 1;
  }
  return { matched: birthdays.length, created };
}

export async function notifyFeePayment(paymentId: string, schoolId: string) {
  const payment = await prisma.feePayment.findFirst({
    where: { id: paymentId, schoolId, status: "SUCCESS" },
    select: {
      id: true,
      receiptNo: true,
      amount: true,
      studentEnrollment: {
        select: {
          studentId: true,
          student: { select: { fullName: true, admissionNo: true } },
        },
      },
    },
  });
  if (!payment) return null;

  const student = payment.studentEnrollment.student;
  const name = student.fullName?.trim() || student.admissionNo;
  const amount = Number(payment.amount).toLocaleString("en-IN");

  const existing = await prisma.announcement.findFirst({
    where: {
      schoolId,
      category: "FEES",
      targetType: "STUDENT",
      targetId: payment.studentEnrollment.studentId,
      body: { contains: payment.receiptNo },
    },
    select: { id: true },
  });
  if (existing) return existing;

  return createEventNotification({
    schoolId,
    title: "Fee payment received",
    body: `₹${amount} received successfully. Receipt: ${payment.receiptNo}.`,
    category: "FEES",
    targetType: "STUDENT",
    targetId: payment.studentEnrollment.studentId,
    targetLabel: name,
    sourceType: "FEE_PAYMENT",
    sourceId: payment.id,
    dedupeKey: notificationDedupeKey.feePayment(payment.id),
  });
}

export async function notifyAttendanceLocked(sessionId: string, schoolId: string) {
  const session = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, schoolId, locked: true },
    select: {
      id: true,
      attendanceDate: true,
      class: { select: { name: true } },
      section: { select: { name: true } },
      records: { select: { studentId: true, status: true } },
    },
  });
  if (!session) return null;

  const absentIds = session.records
    .filter((record) => record.status === "ABSENT")
    .map((record) => record.studentId);
  const present = session.records.filter((record) => record.status === "PRESENT").length;
  const absent = absentIds.length;
  const late = session.records.filter((record) => record.status === "LATE").length;
  const leave = session.records.filter((record) => record.status === "LEAVE").length;
  const label = `${session.class.name} - ${session.section.name}`;

  const adminExisting = await prisma.announcement.findFirst({
    where: {
      schoolId,
      category: "ATTENDANCE_SUMMARY",
      targetType: "ADMIN",
      targetId: session.id,
    },
    select: { id: true },
  });

  if (!adminExisting) {
    await createEventNotification({
      schoolId,
      title: `${label} attendance completed`,
      body: `${session.records.length} students · ${present} present · ${absent} absent · ${late} late · ${leave} leave.`,
      category: "ATTENDANCE_SUMMARY",
      targetType: "ADMIN",
      targetId: session.id,
      targetLabel: "School administrators",
      sourceType: "ATTENDANCE_SESSION",
      sourceId: session.id,
      dedupeKey: notificationDedupeKey.attendanceSummary(session.id),
    });
  }

  for (const studentId of absentIds) {
    const existing = await prisma.announcement.findFirst({
      where: {
        schoolId,
        category: "ATTENDANCE",
        targetType: "STUDENT",
        targetId: studentId,
        createdBy: "SYSTEM",
        publishedAt: { gte: session.attendanceDate },
      },
      select: { id: true },
    });
    if (existing) continue;

    await createEventNotification({
      schoolId,
      title: "Attendance alert",
      body: `You were marked absent today in ${label}.`,
      category: "ATTENDANCE",
      targetType: "STUDENT",
      targetId: studentId,
      targetLabel: "Student",
      sourceType: "ATTENDANCE_SESSION",
      sourceId: session.id,
      dedupeKey: notificationDedupeKey.attendanceAbsent(session.id, studentId),
    });
  }

  return { present, absent, late, leave, total: session.records.length };
}

function leaveDate(value: Date) {
  return value.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function notifyLeaveRequestSubmitted(requestId: string, schoolId: string) {
  const request = await prisma.leaveRequest.findFirst({
    where: { id: requestId, schoolId, status: "PENDING" },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      student: { select: { fullName: true, admissionNo: true } },
      enrollment: {
        select: {
          class: { select: { name: true } },
          section: { select: { name: true } },
        },
      },
    },
  });
  if (!request) return null;

  const studentName = request.student.fullName?.trim() || request.student.admissionNo;
  return createEventNotification({
    schoolId,
    title: "New leave request",
    body: `${studentName} · ${request.enrollment.class.name} ${request.enrollment.section.name} · ${leaveDate(request.startDate)} to ${leaveDate(request.endDate)}.`,
    category: "LEAVE_REQUEST",
    targetType: "ADMIN",
    targetId: request.id,
    targetLabel: "School administrators",
    sourceType: "LEAVE_REQUEST",
    sourceId: request.id,
    dedupeKey: notificationDedupeKey.leaveSubmitted(request.id),
  });
}

export async function notifyLeaveRequestDecided(requestId: string, schoolId: string) {
  const request = await prisma.leaveRequest.findFirst({
    where: { id: requestId, schoolId, status: { in: ["APPROVED", "REJECTED"] } },
    select: {
      status: true,
      studentId: true,
      startDate: true,
      endDate: true,
      decisionNote: true,
      student: { select: { fullName: true, admissionNo: true } },
    },
  });
  if (!request) return null;

  const approved = request.status === "APPROVED";
  const note = request.decisionNote?.trim();
  return createEventNotification({
    schoolId,
    title: approved ? "Leave request approved" : "Leave request rejected",
    body: `${leaveDate(request.startDate)} to ${leaveDate(request.endDate)}${note ? ` · ${note}` : ""}`,
    category: "LEAVE_REQUEST",
    targetType: "STUDENT",
    targetId: request.studentId,
    targetLabel: request.student.fullName?.trim() || request.student.admissionNo,
    sourceType: "LEAVE_REQUEST",
    sourceId: requestId,
    dedupeKey: notificationDedupeKey.leaveDecided(requestId, request.status),
  });
}
