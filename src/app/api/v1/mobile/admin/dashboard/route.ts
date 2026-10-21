import { requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { hasModuleAccess } from "@/lib/staff-permissions";

const ACTIVE_TICKET_STATUSES = ["OPEN", "REOPENED", "ASSIGNED", "IN_PROGRESS", "WAITING"] as const;

function schoolDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(`${values.year}-${values.month}-${values.day}T00:00:00.000Z`);
}

export async function GET() {
  return apiHandler(async () => {
    const membership = await requireRole([
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "ACCOUNTANT",
      "RECEPTIONIST",
    ]);
    const schoolId = membership.schoolId;
    const now = new Date();
    const canReadStudents = hasModuleAccess(membership, "STUDENTS", "VIEW");
    const canReadStaff = hasModuleAccess(membership, "STAFF", "VIEW");
    const canReadAttendance = hasModuleAccess(membership, "ATTENDANCE", "VIEW");
    const canReadLeave = hasModuleAccess(membership, "CALENDAR", "VIEW");
    const canReadSupport = hasModuleAccess(membership, "SUPPORT", "VIEW");
    const canManageSupport = hasModuleAccess(membership, "SUPPORT", "MANAGE");
    const canReadCommunication = hasModuleAccess(membership, "COMMUNICATION", "VIEW");
    const canReadCalendar = hasModuleAccess(membership, "CALENDAR", "VIEW");
    const supportScope = canManageSupport
      ? {}
      : { OR: [{ createdById: membership.userId }, { assignedToId: membership.userId }] };
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, active: true },
      orderBy: { startDate: "desc" },
      select: { id: true, name: true },
    });

    const [students, teachers, classes, attendanceSessionsToday, pendingLeaveRequests,
      openTickets, inProgressTickets, urgentTickets, parentQueries, recentTickets,
      announcements, unreadAnnouncements, upcomingEvents] = await Promise.all([
      canReadStudents
        ? prisma.student.count({ where: { schoolId, status: "ACTIVE" } })
        : Promise.resolve(0),
      canReadStaff
        ? prisma.teacher.count({ where: { schoolId, active: true } })
        : Promise.resolve(0),
      prisma.class.count({ where: { schoolId, active: true } }),
      activeYear && canReadAttendance
        ? prisma.attendanceSession.count({
            where: { schoolId, academicYearId: activeYear.id, attendanceDate: schoolDate() },
          })
        : Promise.resolve(0),
      canReadLeave
        ? prisma.leaveRequest.count({ where: { schoolId, status: "PENDING" } })
        : Promise.resolve(0),
      canReadSupport
        ? prisma.supportTicket.count({ where: { schoolId, ...supportScope, status: { in: ["OPEN", "REOPENED"] } } })
        : Promise.resolve(0),
      canReadSupport
        ? prisma.supportTicket.count({ where: { schoolId, ...supportScope, status: { in: ["ASSIGNED", "IN_PROGRESS", "WAITING"] } } })
        : Promise.resolve(0),
      canReadSupport ? prisma.supportTicket.count({
        where: { schoolId, ...supportScope, priority: "URGENT", status: { in: [...ACTIVE_TICKET_STATUSES] } },
      }) : Promise.resolve(0),
      canReadSupport ? prisma.supportTicket.count({
        where: { schoolId, ...supportScope, source: "PARENT_QR", status: { in: [...ACTIVE_TICKET_STATUSES] } },
      }) : Promise.resolve(0),
      canReadSupport ? prisma.supportTicket.findMany({
        where: { schoolId, ...supportScope },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          ticketNo: true,
          subject: true,
          status: true,
          priority: true,
          source: true,
          createdAt: true,
        },
      }) : Promise.resolve([]),
      canReadCommunication ? prisma.announcement.findMany({
        where: {
          schoolId,
          archived: false,
          publishedAt: { lte: now },
          AND: [
            { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            { OR: [{ sourceType: null }, { sourceType: { not: "BIRTHDAY_SUMMARY" } }] },
          ],
        },
        orderBy: [{ priority: "desc" }, { publishedAt: "desc" }],
        take: 4,
        select: {
          id: true,
          title: true,
          body: true,
          category: true,
          priority: true,
          targetLabel: true,
          publishedAt: true,
          reads: { where: { userId: membership.userId }, select: { id: true } },
        },
      }) : Promise.resolve([]),
      canReadCommunication ? prisma.announcement.count({
        where: {
          schoolId,
          archived: false,
          publishedAt: { lte: now },
          AND: [
            { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            { OR: [{ sourceType: null }, { sourceType: { not: "BIRTHDAY_SUMMARY" } }] },
          ],
          reads: { none: { userId: membership.userId } },
        },
      }) : Promise.resolve(0),
      canReadCalendar ? prisma.schoolCalendarEvent.findMany({
        where: { schoolId, archived: false, endDate: { gte: schoolDate() } },
        orderBy: [{ startDate: "asc" }, { title: "asc" }],
        take: 4,
        select: {
          id: true,
          title: true,
          category: true,
          startDate: true,
          endDate: true,
          targetLabel: true,
        },
      }) : Promise.resolve([]),
    ]);

    return ApiResponse.success({
      academicYearName: activeYear?.name ?? null,
      students,
      teachers,
      classes,
      attendanceSessionsToday,
      pendingLeaveRequests,
      openTickets,
      inProgressTickets,
      urgentTickets,
      parentQueries,
      recentTickets,
      unreadAnnouncements,
      announcements: announcements.map(({ reads, ...announcement }) => ({
        ...announcement,
        read: reads.length > 0,
      })),
      upcomingEvents,
    });
  });
}
