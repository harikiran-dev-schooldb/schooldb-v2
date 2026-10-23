import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { hasModuleAccess, type StaffPermissionModule } from "@/lib/staff-permissions";

const PAGE_SIZE = 20;
const VALID_SECTIONS = new Set([
  "students", "teachers", "classes", "attendance", "fees", "leave", "queries",
  "timetable", "exams", "calendar", "fee-collection", "admissions", "library",
  "transport", "inventory", "birthdays",
  "staff", "visitors", "health", "pickup", "maintenance",
]);

const SECTION_MODULES: Record<string, StaffPermissionModule> = {
  students: "STUDENTS",
  teachers: "ACADEMICS",
  classes: "ACADEMICS",
  attendance: "ATTENDANCE",
  fees: "FEES",
  leave: "CALENDAR",
  queries: "SUPPORT",
  timetable: "TIMETABLE",
  exams: "LEARNING",
  calendar: "CALENDAR",
  "fee-collection": "FEES",
  admissions: "ADMISSIONS",
  library: "LIBRARY",
  transport: "TRANSPORT",
  inventory: "INVENTORY",
  birthdays: "STUDENT_RECORDS",
  staff: "STAFF",
  visitors: "FRONT_OFFICE",
  health: "FRONT_OFFICE",
  pickup: "FRONT_OFFICE",
  maintenance: "FRONT_OFFICE",
};

const BIRTHDAY_PERIODS = new Set(["TODAY", "WEEK", "MONTH"]);

function indiaDateParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(value);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function schoolDate() {
  const parts = indiaDateParts(new Date());
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

export async function GET(request: Request) {
  return apiHandler(async () => {
    const membership = await requireRole([
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "ACCOUNTANT",
      "RECEPTIONIST",
    ]);
    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section") ?? "";
    if (!VALID_SECTIONS.has(section)) return ApiResponse.error("Unknown admin section.", 400);
    if (!hasModuleAccess(membership, SECTION_MODULES[section], "VIEW")) {
      return ApiResponse.error("You do not have permission to view this section.", 403);
    }
    const page = Math.max(1, Math.min(1000, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1));
    const query = (searchParams.get("q") ?? "").trim().slice(0, 100);
    const classId = (searchParams.get("classId") ?? "").trim();
    const sectionId = (searchParams.get("sectionId") ?? "").trim();
    const gender = (searchParams.get("gender") ?? "").toUpperCase();
    const isRteParam = searchParams.get("isRte") ?? "";
    const isRte = isRteParam === "true" ? true : isRteParam === "false" ? false : undefined;
    const requestedBirthdayPeriod = (searchParams.get("period") ?? "MONTH").toUpperCase();
    const birthdayPeriod = BIRTHDAY_PERIODS.has(requestedBirthdayPeriod)
      ? requestedBirthdayPeriod
      : "MONTH";
    const text = query ? { contains: query, mode: "insensitive" as const } : undefined;
    const skip = (page - 1) * PAGE_SIZE;
    const schoolId = membership.schoolId;

    if (section === "staff") {
      const today = schoolDate();
      const where = { schoolId, active: true,
        ...(text ? { OR: [{ fullName: text }, { employeeId: text }, { designation: text }] } : {}) };
      const [total, teachers] = await Promise.all([
        prisma.teacher.count({ where }),
        prisma.teacher.findMany({ where, orderBy: { fullName: "asc" }, skip, take: PAGE_SIZE,
          select: { id: true, fullName: true, employeeId: true, designation: true,
            staffAttendances: { where: { date: today }, take: 1,
              select: { status: true, checkIn: true, checkOut: true } } } }),
      ]);
      return ApiResponse.success({ section, total, page, pageSize: PAGE_SIZE,
        rows: teachers.map((teacher) => {
          const attendance = teacher.staffAttendances[0];
          return { id: teacher.id, title: teacher.fullName,
            subtitle: `${teacher.employeeId} · ${teacher.designation || "Staff"}`,
            detail: attendance
              ? [attendance.checkIn && `In ${attendance.checkIn}`, attendance.checkOut && `Out ${attendance.checkOut}`]
                  .filter(Boolean).join(" · ") || "Attendance recorded"
              : "Attendance not recorded today",
            status: attendance?.status || "NOT MARKED" };
        }) });
    }

    if (section === "visitors") {
      const where = { schoolId, ...(text ? { OR: [
        { visitorName: text }, { phone: text }, { purpose: text }, { personToMeet: text },
        { gatePassCode: text },
      ] } : {}) };
      const [total, visitors] = await Promise.all([
        prisma.visitorLog.count({ where }),
        prisma.visitorLog.findMany({ where, orderBy: { checkInAt: "desc" }, skip, take: PAGE_SIZE }),
      ]);
      return ApiResponse.success({ section, total, page, pageSize: PAGE_SIZE,
        rows: visitors.map((visitor) => ({ id: visitor.id, title: visitor.visitorName,
          subtitle: `${visitor.gatePassCode} · ${visitor.phone}`,
          detail: `${visitor.purpose}${visitor.personToMeet ? ` · Meeting ${visitor.personToMeet}` : ""}`,
          status: visitor.status })) });
    }

    if (section === "health") {
      const where = { schoolId, student: { status: "ACTIVE" as const,
        ...(text ? { OR: [{ fullName: text }, { admissionNo: text }] } : {}) } };
      const [total, visits] = await Promise.all([
        prisma.studentHealthVisit.count({ where }),
        prisma.studentHealthVisit.findMany({ where, orderBy: { occurredAt: "desc" }, skip, take: PAGE_SIZE,
          include: { student: { select: { fullName: true, admissionNo: true } } } }),
      ]);
      return ApiResponse.success({ section, total, page, pageSize: PAGE_SIZE,
        rows: visits.map((visit) => ({ id: visit.id, title: visit.student.fullName,
          subtitle: `${visit.student.admissionNo} · ${visit.occurredAt.toISOString().slice(0, 10)}`,
          detail: `${visit.complaint} · ${visit.actionTaken}`,
          status: visit.disposition })) });
    }

    if (section === "pickup") {
      const where = { schoolId, student: { status: "ACTIVE" as const,
        ...(text ? { OR: [{ fullName: text }, { admissionNo: text }] } : {}) } };
      const [total, authorizations] = await Promise.all([
        prisma.pickupAuthorization.count({ where }),
        prisma.pickupAuthorization.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: PAGE_SIZE,
          include: { student: { select: { fullName: true, admissionNo: true } } } }),
      ]);
      return ApiResponse.success({ section, total, page, pageSize: PAGE_SIZE,
        rows: authorizations.map((authorization) => ({ id: authorization.id,
          title: authorization.student.fullName,
          subtitle: `${authorization.student.admissionNo} · ${authorization.authorizedName}`,
          detail: `${authorization.relationship} · ${authorization.phone} · Code ${authorization.pickupCode}`,
          status: authorization.status })) });
    }

    if (section === "maintenance") {
      const where = { schoolId, ...(text ? { OR: [
        { title: text }, { ticketNo: text }, { description: text }, { location: text },
      ] } : {}) };
      const [total, tickets] = await Promise.all([
        prisma.maintenanceTicket.count({ where }),
        prisma.maintenanceTicket.findMany({ where,
          orderBy: [{ status: "asc" }, { createdAt: "desc" }], skip, take: PAGE_SIZE }),
      ]);
      return ApiResponse.success({ section, total, page, pageSize: PAGE_SIZE,
        rows: tickets.map((ticket) => ({ id: ticket.id, title: ticket.title,
          subtitle: `${ticket.ticketNo} · ${ticket.category}${ticket.location ? ` · ${ticket.location}` : ""}`,
          detail: ticket.description, status: ticket.status })) });
    }

    if (section === "students") {
      const where = { schoolId, status: "ACTIVE" as const,
        ...(gender === "MALE" || gender === "FEMALE" || gender === "OTHER"
          ? { gender: gender as "MALE" | "FEMALE" | "OTHER" } : {}),
        ...(isRte !== undefined ? { isRte } : {}),
        ...(text ? { OR: [
          { fullName: text }, { admissionNo: text }, { phone: text },
          { alternatePhone: text }, { fatherPhone: text }, { motherPhone: text },
          { guardianPhone: text },
        ] } : {}),
        ...(classId || sectionId ? { enrollments: { some: {
          active: true,
          ...(classId ? { classId } : {}),
          ...(sectionId ? { sectionId } : {}),
          academicYear: { active: true },
        } } } : {}) };
      const [total, students, classes, sections] = await Promise.all([
        prisma.student.count({ where }),
        prisma.student.findMany({ where, orderBy: { fullName: "asc" }, skip, take: PAGE_SIZE,
          select: { id: true, fullName: true, admissionNo: true,
            enrollments: { where: { active: true, academicYear: { active: true } }, take: 1,
              select: { class: { select: { name: true } }, section: { select: { name: true } } } } } }),
        prisma.class.findMany({
          where: {
            schoolId,
            active: true,
            enrollments: { some: { active: true, academicYear: { active: true } } },
          },
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        }),
        prisma.section.findMany({
          where: {
            active: true,
            class: { schoolId, active: true },
            enrollments: { some: { active: true, academicYear: { active: true } } },
          },
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true, classId: true },
        }),
      ]);
      return ApiResponse.success({ section, total, page, pageSize: PAGE_SIZE,
        classes, sections,
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
          select: { id: true, attendanceDate: true, sessionType: true, locked: true,
            class: { select: { name: true } }, section: { select: { name: true } },
            _count: { select: { records: true } } } }),
      ]);
      return ApiResponse.success({ section, total, page, pageSize: PAGE_SIZE,
        rows: sessions.map((session) => ({ id: session.id,
          title: `${session.class.name} · ${session.section.name}`,
          subtitle: session.attendanceDate.toISOString().slice(0, 10),
          detail: `${session.sessionType || "DAILY"} · ${session._count.records} attendance records`,
          status: session.locked ? "LOCKED" : "OPEN",
          locked: session.locked })) });
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
      const [total, pendingTotal] = await Promise.all([
        prisma.leaveRequest.count({ where }),
        prisma.leaveRequest.count({ where: { ...where, status: "PENDING" } }),
      ]);
      // Pending decisions are the actionable records on this screen. Page across the
      // pending and completed groups separately so an older rejected request can never
      // push a newer pending request onto a later page.
      const pendingSkip = Math.min(skip, pendingTotal);
      const pendingTake = Math.min(PAGE_SIZE, Math.max(0, pendingTotal - pendingSkip));
      const completedSkip = Math.max(0, skip - pendingTotal);
      const completedTake = PAGE_SIZE - pendingTake;
      const [pendingRequests, completedRequests] = await Promise.all([
        pendingTake > 0 ? prisma.leaveRequest.findMany({
          where: { ...where, status: "PENDING" }, orderBy: { createdAt: "desc" },
          skip: pendingSkip, take: pendingTake,
          select: {
            id: true, startDate: true, endDate: true, reason: true, status: true,
            student: { select: { fullName: true, admissionNo: true } },
            enrollment: {
              select: {
                class: { select: { name: true } },
                section: { select: { name: true } },
              },
            },
          },
        })
        : Promise.resolve([]),
        completedTake > 0 ? prisma.leaveRequest.findMany({
          where: { ...where, NOT: { status: "PENDING" } }, orderBy: { createdAt: "desc" },
          skip: completedSkip, take: completedTake,
          select: {
            id: true, startDate: true, endDate: true, reason: true, status: true,
            student: { select: { fullName: true, admissionNo: true } },
            enrollment: {
              select: {
                class: { select: { name: true } },
                section: { select: { name: true } },
              },
            },
          },
        })
        : Promise.resolve([]),
      ]);
      const requests = [...pendingRequests, ...completedRequests];
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

    if (section === "library") {
      const where = { schoolId, active: true,
        ...(text ? { OR: [
          { title: text }, { author: text }, { accessionNo: text },
          { category: { name: text } },
        ] } : {}) };
      const [total, books] = await Promise.all([
        prisma.libraryBook.count({ where }),
        prisma.libraryBook.findMany({ where, orderBy: [{ title: "asc" }, { author: "asc" }],
          skip, take: PAGE_SIZE,
          select: { id: true, title: true, author: true, accessionNo: true, shelf: true,
            category: { select: { name: true } }, _count: { select: { copies: true } } } }),
      ]);
      return ApiResponse.success({ section, total, page, pageSize: PAGE_SIZE,
        rows: books.map((book) => ({ id: book.id, title: book.title,
          subtitle: `${book.author} · ${book.accessionNo}`,
          detail: `${book._count.copies} ${book._count.copies === 1 ? "copy" : "copies"}${book.shelf ? ` · Shelf ${book.shelf}` : ""}`,
          status: book.category?.name || "UNCATEGORIZED" })) });
    }

    if (section === "transport") {
      const where = { schoolId, active: true,
        ...(text ? { OR: [
          { name: text }, { code: text }, { vehicle: { registrationNo: text } },
          { vehicle: { driverName: text } },
        ] } : {}) };
      const [total, routes] = await Promise.all([
        prisma.transportRoute.count({ where }),
        prisma.transportRoute.findMany({ where, orderBy: [{ name: "asc" }, { code: "asc" }],
          skip, take: PAGE_SIZE,
          select: { id: true, name: true, code: true, pickupStart: true, dropStart: true,
            vehicle: { select: { registrationNo: true, capacity: true, driverName: true } },
            _count: { select: {
              stops: { where: { active: true } },
              assignments: { where: { active: true } },
            } } } }),
      ]);
      return ApiResponse.success({ section, total, page, pageSize: PAGE_SIZE,
        rows: routes.map((route) => ({ id: route.id, title: route.name,
          subtitle: `${route.code} · ${route._count.stops} stops · ${route._count.assignments} students`,
          detail: route.vehicle
            ? `${route.vehicle.registrationNo} · ${route.vehicle.driverName} · ${route.vehicle.capacity} seats`
            : "No vehicle assigned",
          status: route.vehicle ? "ACTIVE" : "NEEDS VEHICLE" })) });
    }

    if (section === "inventory") {
      const where = { schoolId, active: true,
        ...(text ? { OR: [
          { name: text }, { assetCode: text }, { category: text }, { location: text },
          { custodian: text },
        ] } : {}) };
      const [total, items] = await Promise.all([
        prisma.inventoryItem.count({ where }),
        prisma.inventoryItem.findMany({ where, orderBy: [{ category: "asc" }, { name: "asc" }],
          skip, take: PAGE_SIZE,
          select: { id: true, name: true, assetCode: true, category: true, location: true,
            quantity: true, reorderLevel: true, condition: true, custodian: true } }),
      ]);
      return ApiResponse.success({ section, total, page, pageSize: PAGE_SIZE,
        rows: items.map((item) => ({ id: item.id, title: item.name,
          subtitle: `${item.assetCode} · ${item.category}`,
          detail: `${item.quantity} in stock${item.location ? ` · ${item.location}` : ""}${item.custodian ? ` · ${item.custodian}` : ""}`,
          status: item.quantity <= item.reorderLevel ? "LOW STOCK" : item.condition })) });
    }

    if (section === "birthdays") {
      const students = await prisma.student.findMany({
        where: { schoolId, status: "ACTIVE",
          ...(text ? { OR: [{ fullName: text }, { admissionNo: text }] } : {}) },
        select: { id: true, fullName: true, admissionNo: true, dob: true,
          enrollments: { where: { active: true, academicYear: { active: true } }, take: 1,
            select: { class: { select: { name: true } }, section: { select: { name: true } } } } },
      });
      const indiaToday = indiaDateParts(new Date());
      const today = new Date(Date.UTC(indiaToday.year, indiaToday.month - 1, indiaToday.day));
      const birthdays = students.map((student) => {
        const birthdayMonth = student.dob.getUTCMonth();
        const birthdayDay = student.dob.getUTCDate();
        let occurrence = new Date(Date.UTC(indiaToday.year, birthdayMonth, birthdayDay));
        if (birthdayPeriod !== "MONTH" && occurrence < today) {
          occurrence = new Date(Date.UTC(indiaToday.year + 1, birthdayMonth, birthdayDay));
        }
        const daysAway = Math.round((occurrence.getTime() - today.getTime()) / 86_400_000);
        return { student, occurrence, daysAway, birthdayMonth };
      }).filter((item) => {
        if (birthdayPeriod === "TODAY") return item.daysAway === 0;
        if (birthdayPeriod === "WEEK") return item.daysAway >= 0 && item.daysAway <= 7;
        return item.birthdayMonth === indiaToday.month - 1;
      }).sort((left, right) => left.occurrence.getTime() - right.occurrence.getTime() ||
          (left.student.fullName || left.student.admissionNo)
            .localeCompare(right.student.fullName || right.student.admissionNo));
      const rows = birthdays.slice(skip, skip + PAGE_SIZE).map(({ student, occurrence, daysAway }) => ({
        id: student.id,
        title: student.fullName || student.admissionNo,
        subtitle: student.enrollments[0]
          ? `${student.enrollments[0].class.name} · ${student.enrollments[0].section.name}`
          : `Admission ${student.admissionNo}`,
        detail: occurrence.toISOString().slice(0, 10),
        status: daysAway === 0
          ? "TODAY"
          : daysAway === 1
            ? "TOMORROW"
            : daysAway > 1
              ? `IN ${daysAway} DAYS`
              : occurrence.toLocaleDateString("en-IN", { month: "short", day: "numeric", timeZone: "UTC" }).toUpperCase(),
      }));
      return ApiResponse.success({
        section,
        period: birthdayPeriod,
        total: birthdays.length,
        page,
        pageSize: PAGE_SIZE,
        rows,
      });
    }

    const canManageSupport = hasModuleAccess(membership, "SUPPORT", "MANAGE");
    const searchScope = text ? { OR: [
      { subject: text }, { ticketNo: text }, { description: text },
    ] } : {};
    const visibilityScope = canManageSupport
      ? {}
      : { OR: [{ createdById: membership.userId }, { assignedToId: membership.userId }] };
    const where = {
      schoolId,
      source: "PARENT_QR" as const,
      AND: [searchScope, visibilityScope],
    };
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
