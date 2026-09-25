import { prisma } from "@/lib/prisma";
import { sendAnnouncementPush } from "./push";

async function createEventNotification(input: {
  schoolId: string;
  title: string;
  body: string;
  category: string;
  targetType: "SCHOOL" | "CLASS" | "SECTION" | "STUDENT" | "ADMIN";
  targetId: string | null;
  targetLabel: string;
}) {
  const announcement = await prisma.announcement.create({
    data: {
      ...input,
      priority: "NORMAL",
      createdBy: "SYSTEM",
      publishedAt: new Date(),
    },
  });
  void sendAnnouncementPush(announcement);
  return announcement;
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
  });
}
