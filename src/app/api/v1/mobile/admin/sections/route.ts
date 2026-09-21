import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

const PAGE_SIZE = 20;
const VALID_SECTIONS = new Set(["students", "teachers", "classes", "attendance", "fees", "leave", "queries"]);

export async function GET(request: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section") ?? "";
    if (!VALID_SECTIONS.has(section)) return ApiResponse.error("Unknown admin section.", 400);
    const page = Math.max(1, Math.min(1000, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1));
    const skip = (page - 1) * PAGE_SIZE;
    const schoolId = membership.schoolId;

    if (section === "students") {
      const where = { schoolId, status: "ACTIVE" as const };
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
      const where = { schoolId, active: true };
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
      const where = { schoolId, active: true };
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
      const where = { schoolId };
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
      const where = { schoolId, status: "SUCCESS" as const };
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
      const where = { schoolId };
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

    const where = { schoolId, source: "PARENT_QR" };
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
