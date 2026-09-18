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
