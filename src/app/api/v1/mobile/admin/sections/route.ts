import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

const PAGE_SIZE = 20;
const VALID_SECTIONS = new Set([
  "students", "teachers", "classes", "attendance", "fees", "leave", "queries",
  "timetable", "exams", "calendar", "fee-collection", "admissions",
]);

export async function GET(request: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section") ?? "";
    if (!VALID_SECTIONS.has(section)) return ApiResponse.error("Unknown admin section.", 400);
    const page = Math.max(1, Math.min(1000, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1));
    const query = (searchParams.get("q") ?? "").trim().slice(0, 100);
    const text = query ? { contains: query, mode: "insensitive" as const } : undefined;
    const skip = (page - 1) * PAGE_SIZE;
    const schoolId = membership.schoolId;

    if (section === "students") {
      const where = { schoolId, status: "ACTIVE" as const,
        ...(text ? { OR: [{ fullName: text }, { admissionNo: text }] } : {}) };
      const [total, students] = await Promise.all([
        prisma.student.count({ where }),
        prisma.student.findMany({ where, orderBy: { fullName: "asc" }, skip, take: PAGE_SIZE,
          select: { id: true, fullName: true, admissionNo: true,
            enrollments: { where: { active: true, academicYear: { active: true } }, take: 1,
              select: { class: { select: { name: true } }, section: { select: { name: true } } } } } }),
      ]);
      return ApiResponse.success({ section, total, page, pageSize: PAGE_SIZE,
        rows: students.map((student) => ({ id: student.id,
          title: student.fullName || student.admissionNo,
          subtitle: `Admission ${student.admissionNo}`,
          detail: student.enrollments[0]
            ? `${student.enrollments[0].class.name} · ${student.enrollments[0].section.name}` : "Not enrolled",
          status: "ACTIVE" })) });
    }

    if (section === "teachers") {
      const where = { schoolId, active: true,
        ...(text ? { OR: [{ fullName: text }, { employeeId: text }, { designation: text }] } : {}) };
      const [total, teachers] = await Promise.all([
        prisma.teacher.count({ where }),
        prisma.teacher.findMany({ where, orderBy: { fullName: "asc" }, skip, take: PAGE_SIZE,
          select: { id: true, fullName: true, employeeId: true, designation: true } }),
      ]);
      return ApiResponse.success({ section, total, page, pageSize: PAGE_SIZE,
        rows: teachers.map((teacher) => ({ id: teacher.id, title: teacher.fullName,
          subtitle: teacher.designation || "Teacher", detail: `Employee ${teacher.employeeId}`, status: "ACTIVE" })) });
    }

    if (section === "classes") {
      const where = { schoolId, active: true,
        ...(text ? { OR: [{ name: text }, { code: text }] } : {}) };
      const [total, classes] = await Promise.all([
        prisma.class.count({ where }),
        prisma.class.findMany({ where, orderBy: [{ displayOrder: "asc" }, { name: "asc" }], skip, take: PAGE_SIZE,
          select: { id: true, name: true, code: true,
            _count: { select: { sections: true, enrollments: true } } } }),
      ]);
      return ApiResponse.success({ section, total, page, pageSize: PAGE_SIZE,
        rows: classes.map((item) => ({ id: item.id, title: item.name,
          subtitle: `${item._count.sections} sections`, detail: `${item._count.enrollments} enrollments`,
          status: item.code || "" })) });
    }

    if (section === "attendance") {
      const where = { schoolId, ...(text ? { OR: [
        { class: { name: text } }, { section: { name: text } },
      ] } : {}) };
      const [total, sessions] = await Promise.all([
        prisma.attendanceSession.count({ where }),
        prisma.attendanceSession.findMany({ where,
          orderBy: [{ attendanceDate: "desc" }, { createdAt: "desc" }], skip, take: PAGE_SIZE,
          select: { id: true, attendanceDate: true, sessionType: true,
            class: { select: { name: true } }, section: { select: { name: true } },
            _count: { select: { records: true } } } }),
      ]);
      return ApiResponse.success({ section, total, page, pageSize: PAGE_SIZE,
        rows: sessions.map((session) => ({ id: session.id,
          title: `${session.class.name} · ${session.section.name}`,
          subtitle: session.attendanceDate.toISOString().slice(0, 10),
          detail: `${session._count.records} attendance records`,
          status: session.sessionType || "DAILY" })) });
    }

    if (section === "fees") {
      const where = { schoolId, status: "SUCCESS" as const,
        ...(text ? { OR: [
          { receiptNo: text },
          { studentEnrollment: { student: { OR: [{ fullName: text }, { admissionNo: text }] } } },
        ] } : {}) };
      const [total, payments] = await Promise.all([
        prisma.feePayment.count({ where }),
        prisma.feePayment.findMany({ where, orderBy: { paymentDate: "desc" }, skip, take: PAGE_SIZE,
          select: { id: true, receiptNo: true, amount: true, paymentDate: true, paymentMode: true,
            studentEnrollment: { select: { student: { select: { fullName: true, admissionNo: true } } } } } }),
      ]);
      return ApiResponse.success({ section, total, page, pageSize: PAGE_SIZE,
        rows: payments.map((payment) => ({ id: payment.id,
          title: payment.studentEnrollment.student.fullName || payment.studentEnrollment.student.admissionNo,
          subtitle: `${payment.receiptNo} · ${payment.paymentDate.toISOString().slice(0, 10)}`,
          detail: `₹${Number(payment.amount).toLocaleString("en-IN")}`,
          status: payment.paymentMode })) });
    }

    if (section === "leave") {
      const where = { schoolId, ...(text ? { OR: [
        { reason: text }, { student: { OR: [{ fullName: text }, { admissionNo: text }] } },
      ] } : {}) };
      const [total, requests] = await Promise.all([
        prisma.leaveRequest.count({ where }),
        prisma.leaveRequest.findMany({ where, orderBy: [{ status: "desc" }, { createdAt: "desc" }],
          skip, take: PAGE_SIZE,
          select: { id: true, startDate: true, endDate: true, reason: true, status: true,
            student: { select: { fullName: true, admissionNo: true } },
            enrollment: { select: { class: { select: { name: true } }, section: { select: { name: true } } } } } }),
      ]);
      return ApiResponse.success({ section, total, page, pageSize: PAGE_SIZE,
        rows: requests.map((item) => ({ id: item.id,
          title: item.student.fullName || item.student.admissionNo,
          subtitle: `${item.enrollment.class.name} · ${item.enrollment.section.name} · ${item.startDate.toISOString().slice(0, 10)} to ${item.endDate.toISOString().slice(0, 10)}`,
          detail: item.reason, status: item.status })) });
    }

    if (section === "timetable") {
      const where = { schoolId, active: true, academicYear: { active: true },
        ...(text ? { OR: [
          { period: { name: text } },
          { teacherAllocation: { subject: { name: text } } },
          { teacherAllocation: { teacher: { fullName: text } } },
          { teacherAllocation: { class: { name: text } } },
          { teacherAllocation: { section: { name: text } } },
        ] } : {}) };
      const [total, entries] = await Promise.all([
        prisma.timetable.count({ where }),
        prisma.timetable.findMany({ where,
          orderBy: [{ day: "asc" }, { period: { displayOrder: "asc" } }], skip, take: PAGE_SIZE,
          select: { id: true, day: true,
            period: { select: { name: true, startTime: true, endTime: true } },
            teacherAllocation: { select: {
              class: { select: { name: true } }, section: { select: { name: true } },
              subject: { select: { name: true } }, teacher: { select: { fullName: true } },
            } } } }),
      ]);
      return ApiResponse.success({ section, total, page, pageSize: PAGE_SIZE,
        rows: entries.map((item) => ({ id: item.id,
          title: `${item.teacherAllocation.class.name} · ${item.teacherAllocation.section.name}`,
          subtitle: `${item.day.replaceAll("_", " ")} · ${item.period.name} · ${item.period.startTime}–${item.period.endTime}`,
          detail: `${item.teacherAllocation.subject.name} · ${item.teacherAllocation.teacher.fullName}`,
          status: "ACTIVE" })) });
    }

    if (section === "exams") {
      const where = { schoolId, active: true, ...(text ? { name: text } : {}) };
      const [total, exams] = await Promise.all([
        prisma.exam.count({ where }),
        prisma.exam.findMany({ where, orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
          skip, take: PAGE_SIZE,
          select: { id: true, name: true, status: true, startDate: true, endDate: true,
            academicYear: { select: { name: true } }, _count: { select: { schedules: true } } } }),
      ]);
      return ApiResponse.success({ section, total, page, pageSize: PAGE_SIZE,
        rows: exams.map((item) => ({ id: item.id, title: item.name,
          subtitle: item.startDate
            ? `${item.startDate.toISOString().slice(0, 10)}${item.endDate ? ` to ${item.endDate.toISOString().slice(0, 10)}` : ""}`
            : item.academicYear.name,
          detail: `${item._count.schedules} exam schedules`, status: item.status })) });
    }

    if (section === "calendar") {
      const where = { schoolId, archived: false, ...(text ? { OR: [
        { title: text }, { description: text }, { targetLabel: text },
      ] } : {}) };
      const [total, events] = await Promise.all([
        prisma.schoolCalendarEvent.count({ where }),
        prisma.schoolCalendarEvent.findMany({ where, orderBy: [{ startDate: "desc" }, { title: "asc" }],
          skip, take: PAGE_SIZE,
          select: { id: true, title: true, description: true, category: true,
            startDate: true, endDate: true, targetLabel: true } }),
      ]);
      return ApiResponse.success({ section, total, page, pageSize: PAGE_SIZE,
        rows: events.map((item) => ({ id: item.id, title: item.title,
          subtitle: `${item.startDate.toISOString().slice(0, 10)}${item.endDate > item.startDate ? ` to ${item.endDate.toISOString().slice(0, 10)}` : ""} · ${item.targetLabel}`,
          detail: item.description || "School calendar event", status: item.category })) });
    }

    if (section === "fee-collection") {
      const where = {
        status: { in: ["PENDING" as const, "PARTIAL" as const] },
        studentFeeItem: { studentFee: { schoolId } },
        ...(text ? { OR: [
          { name: text },
          { studentFeeItem: { studentFee: { studentEnrollment: { student: {
            OR: [{ fullName: text }, { admissionNo: text }],
          } } } } },
        ] } : {}),
      };
      const [total, installments] = await Promise.all([
        prisma.studentFeeInstallment.count({ where }),
        prisma.studentFeeInstallment.findMany({ where, orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
          skip, take: PAGE_SIZE,
          select: {
            id: true, name: true, payableAmount: true, paidAmount: true, dueDate: true, status: true,
            studentFeeItem: {
              select: {
                studentFee: {
                  select: {
                    studentEnrollment: {
                      select: {
                        student: { select: { fullName: true, admissionNo: true } },
                        class: { select: { name: true } },
                        section: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      ]);
      return ApiResponse.success({ section, total, page, pageSize: PAGE_SIZE,
        rows: installments.map((item) => {
          const enrollment = item.studentFeeItem.studentFee.studentEnrollment;
          const outstanding = Number(item.payableAmount) - Number(item.paidAmount);
          return { id: item.id, title: enrollment.student.fullName || enrollment.student.admissionNo,
            subtitle: `${enrollment.class.name} · ${enrollment.section.name} · Due ${item.dueDate.toISOString().slice(0, 10)}`,
            detail: `${item.name} · ₹${outstanding.toLocaleString("en-IN")}`, status: item.status };
        }) });
    }

    if (section === "admissions") {
      const where = { schoolId, ...(text ? { OR: [
        { studentName: text }, { applicationNo: text },
        { applyingClass: { name: text } }, { preferredSection: { name: text } },
      ] } : {}) };
      const [total, applications] = await Promise.all([
        prisma.admissionApplication.count({ where }),
        prisma.admissionApplication.findMany({ where, orderBy: { submittedAt: "desc" }, skip, take: PAGE_SIZE,
          select: { id: true, applicationNo: true, studentName: true, status: true, submittedAt: true,
            applyingClass: { select: { name: true } }, preferredSection: { select: { name: true } } } }),
      ]);
      return ApiResponse.success({ section, total, page, pageSize: PAGE_SIZE,
        rows: applications.map((item) => ({ id: item.id, title: item.studentName,
          subtitle: `${item.applicationNo} · ${item.submittedAt.toISOString().slice(0, 10)}`,
          detail: `${item.applyingClass.name}${item.preferredSection ? ` · ${item.preferredSection.name}` : ""}`,
          status: item.status })) });
    }

    const where = { schoolId, source: "PARENT_QR", ...(text ? { OR: [
      { subject: text }, { ticketNo: text }, { description: text },
    ] } : {}) };
    const [total, queries] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: PAGE_SIZE,
        select: { id: true, ticketNo: true, subject: true, status: true, priority: true, createdAt: true } }),
    ]);
    return ApiResponse.success({ section, total, page, pageSize: PAGE_SIZE,
      rows: queries.map((item) => ({ id: item.id, title: item.subject,
        subtitle: `${item.ticketNo} · ${item.createdAt.toISOString().slice(0, 10)}`,
        detail: item.priority, status: item.status })) });
  });
}
