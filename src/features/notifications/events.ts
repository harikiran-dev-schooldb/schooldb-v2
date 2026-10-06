import { prisma } from "@/lib/prisma";
import { findActiveBirthdayStudents } from "@/features/students/services/birthday-summary.service";
import { sendAnnouncementPush } from "./push";
import { notificationDedupeKey } from "./dedupe";

async function createEventNotification(input: {
  schoolId: string;
  title: string;
  body: string;
  category: string;
  targetType:
    | "SCHOOL"
    | "SYLLABUS"
    | "BRANCH"
    | "CLASS"
    | "SECTION"
    | "STUDENT"
    | "TEACHER"
    | "ADMIN";
  targetId: string | null;
  targetLabel: string;
  sourceType?: string;
  sourceId?: string;
  dedupeKey?: string;
}) {
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

/**
 * Create the in-app alert shown to the affected staff member when they are
 * marked absent. The TEACHER target is resolved to the teacher's linked app
 * account by the push delivery layer.
 */
export async function notifyStaffAttendanceAbsent(input: {
  schoolId: string;
  teacherId: string;
  attendanceDate: Date;
  performedByUserId?: string;
}) {
  const teacher = await prisma.teacher.findFirst({
    where: { id: input.teacherId, schoolId: input.schoolId, active: true },
    select: { id: true, fullName: true, employeeId: true },
  });
  if (!teacher) return null;

  const dateKey = indiaDateKey(input.attendanceDate);
  const name = teacher.fullName.trim() || teacher.employeeId;
  return createEventNotification({
    schoolId: input.schoolId,
    title: "Staff attendance marked absent",
    body: `Your attendance for ${formatDate(input.attendanceDate)} was marked absent. Contact the school office if this needs correction.`,
    category: "ATTENDANCE",
    targetType: "TEACHER",
    targetId: teacher.id,
    targetLabel: name,
    sourceType: "STAFF_ATTENDANCE",
    sourceId: `${teacher.id}:${dateKey}`,
    dedupeKey: `staff-attendance:${teacher.id}:${dateKey}`,
  });
}

export async function notifyStaffAttendancePresentCorrection(input: {
  schoolId: string;
  teacherId: string;
  attendanceDate: Date;
}) {
  const teacher = await prisma.teacher.findFirst({
    where: { id: input.teacherId, schoolId: input.schoolId, active: true },
    select: { id: true, fullName: true, employeeId: true },
  });
  if (!teacher) return null;

  const dateKey = indiaDateKey(input.attendanceDate);
  const name = teacher.fullName.trim() || teacher.employeeId;
  return createEventNotification({
    schoolId: input.schoolId,
    title: "Staff attendance corrected",
    body: `Your attendance for ${formatDate(input.attendanceDate)} was corrected from absent to present.`,
    category: "ATTENDANCE",
    targetType: "TEACHER",
    targetId: teacher.id,
    targetLabel: name,
    sourceType: "STAFF_ATTENDANCE_CORRECTION",
    sourceId: `${teacher.id}:${dateKey}`,
    dedupeKey: `staff-attendance-correction:${teacher.id}:${dateKey}:present`,
  });
}

export async function notifyStudentAttendancePresentCorrection(input: {
  schoolId: string;
  studentId: string;
  sessionId: string;
  attendanceDate: Date;
  classLabel: string;
}) {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, schoolId: input.schoolId, status: "ACTIVE" },
    select: { id: true, fullName: true, admissionNo: true },
  });
  if (!student) return null;

  return createEventNotification({
    schoolId: input.schoolId,
    title: "Attendance corrected to present",
    body: `${student.fullName || student.admissionNo}'s attendance for ${formatDate(input.attendanceDate)} in ${input.classLabel} was corrected from absent to present.`,
    category: "ATTENDANCE",
    targetType: "STUDENT",
    targetId: student.id,
    targetLabel: student.fullName || student.admissionNo,
    sourceType: "ATTENDANCE_CORRECTION",
    sourceId: `${input.sessionId}:${student.id}`,
    dedupeKey: notificationDedupeKey.attendancePresentCorrection(input.sessionId, student.id),
  });
}

function indiaDateKey(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(value);
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

export async function notifyExamResultsPublished(
  examId: string,
  schoolId: string,
  performedByUserId?: string,
) {
  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId, status: "COMPLETED", active: true },
    select: {
      name: true,
      academicYearId: true,
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

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      schoolId,
      academicYearId: exam.academicYearId,
      active: true,
      student: { status: "ACTIVE" },
      OR: scopes.map((scope) => ({
        classId: scope.classId,
        ...(scope.sectionId ? { sectionId: scope.sectionId } : {}),
      })),
    },
    select: { id: true, studentId: true },
  });
  if (enrollments.length > 0) {
    await prisma.studentActivity.createMany({
      data: enrollments.map((enrollment) => ({
        schoolId,
        studentId: enrollment.studentId,
        enrollmentId: enrollment.id,
        type: "EXAM_RESULT_PUBLISHED" as const,
        title: `${exam.name} result published`,
        description: "The student's exam result and report card are now available.",
        performedByUserId,
        sourceType: "EXAM",
        sourceId: examId,
      })),
      skipDuplicates: true,
    });
  }
  return notifications;
}

export async function notifyDailyBirthdays(now = new Date()) {
  const dateKey = indiaDateKey(now);
  const birthdays = await findActiveBirthdayStudents(now);
  const birthdayKeys = birthdays.map((student) =>
    notificationDedupeKey.birthday(student.id, dateKey),
  );
  const existingBirthdayKeys = birthdayKeys.length > 0
    ? new Set(
        (
          await prisma.announcement.findMany({
            where: { dedupeKey: { in: birthdayKeys } },
            select: { dedupeKey: true },
          })
        ).flatMap((announcement) =>
          announcement.dedupeKey ? [announcement.dedupeKey] : [],
        ),
      )
    : new Set<string>();

  let created = 0;
  for (const student of birthdays) {
    const dedupeKey = notificationDedupeKey.birthday(student.id, dateKey);
    if (existingBirthdayKeys.has(dedupeKey)) continue;
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
      dedupeKey,
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

export async function notifyAttendanceLocked(
  sessionId: string,
  schoolId: string,
  performedByUserId?: string,
) {
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

  await prisma.studentActivity.createMany({
    data: session.records.map((record) => ({
      schoolId,
      studentId: record.studentId,
      type: "ATTENDANCE_MARKED" as const,
      title: "Attendance finalized",
      description: `${session.class.name} - ${session.section.name}: ${record.status.toLowerCase()}.`,
      performedByUserId,
      sourceType: "ATTENDANCE_SESSION",
      sourceId: session.id,
      metadata: { sessionId: session.id, status: record.status },
    })),
    skipDuplicates: true,
  });

  const absentIds = session.records
    .filter((record) => record.status === "ABSENT")
    .map((record) => record.studentId);
  const present = session.records.filter((record) => record.status === "PRESENT").length;
  const absent = absentIds.length;
  const late = session.records.filter((record) => record.status === "LATE").length;
  const leave = session.records.filter((record) => record.status === "LEAVE").length;
  const label = `${session.class.name} - ${session.section.name}`;

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

  for (const studentId of absentIds) {
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

export async function notifyStudentProfileImageSubmitted(
  studentId: string,
  schoolId: string,
  storageKey: string,
) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId, status: "ACTIVE" },
    select: { fullName: true, admissionNo: true },
  });
  if (!student) return null;

  const studentName = student.fullName?.trim() || student.admissionNo;
  return createEventNotification({
    schoolId,
    title: "Student profile image awaiting approval",
    body: `${studentName} submitted a profile image. Review it in Settings → Student image approvals.`,
    category: "PROFILE_IMAGE",
    targetType: "ADMIN",
    targetId: studentId,
    targetLabel: "School administrators",
    sourceType: "STUDENT_PROFILE_IMAGE",
    sourceId: studentId,
    dedupeKey: notificationDedupeKey.profileImageSubmitted(
      studentId,
      storageKey,
    ),
  });
}
