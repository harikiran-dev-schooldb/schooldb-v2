import { requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

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
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const schoolId = membership.schoolId;
    const now = new Date();
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, active: true },
      orderBy: { startDate: "desc" },
      select: { id: true, name: true },
    });

    const [students, teachers, classes, attendanceSessionsToday, pendingLeaveRequests,
      openTickets, inProgressTickets, urgentTickets, parentQueries, recentTickets,
      announcements, unreadAnnouncements, upcomingEvents] = await Promise.all([
      prisma.student.count({ where: { schoolId, status: "ACTIVE" } }),
      prisma.teacher.count({ where: { schoolId, active: true } }),
      prisma.class.count({ where: { schoolId, active: true } }),
      activeYear
        ? prisma.attendanceSession.count({
            where: { schoolId, academicYearId: activeYear.id, attendanceDate: schoolDate() },
          })
        : Promise.resolve(0),
      prisma.leaveRequest.count({ where: { schoolId, status: "PENDING" } }),
      prisma.supportTicket.count({ where: { schoolId, status: { in: ["OPEN", "REOPENED"] } } }),
      prisma.supportTicket.count({ where: { schoolId, status: { in: ["ASSIGNED", "IN_PROGRESS", "WAITING"] } } }),
      prisma.supportTicket.count({
        where: { schoolId, priority: "URGENT", status: { in: [...ACTIVE_TICKET_STATUSES] } },
      }),
      prisma.supportTicket.count({
        where: { schoolId, source: "PARENT_QR", status: { in: [...ACTIVE_TICKET_STATUSES] } },
      }),
      prisma.supportTicket.findMany({
        where: { schoolId },
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
      }),
      prisma.announcement.findMany({
        where: {
          schoolId,
          archived: false,
          publishedAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
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
      }),
      prisma.announcement.count({
        where: {
          schoolId,
          archived: false,
          publishedAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          reads: { none: { userId: membership.userId } },
        },
      }),
      prisma.schoolCalendarEvent.findMany({
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
      }),
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
