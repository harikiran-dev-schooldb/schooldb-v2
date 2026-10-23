import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { supportActor } from "@/lib/support-tickets";

const ACTIVE_STATUSES = ["OPEN", "REOPENED", "ASSIGNED", "IN_PROGRESS", "WAITING"] as const;

export async function GET() {
  return apiHandler(async () => {
    const actor = await supportActor();
    if (!actor.isAdmin) throw new ApiError(403, "Admin access required.");

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const waitingCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const schoolWhere = { schoolId: actor.schoolId };

    const [
      totalThisMonth,
      resolvedThisMonth,
      resolvedCreatedThisMonth,
      open,
      active,
      urgent,
      unassigned,
      waitingOverTwoDays,
      newToday,
      byType,
      assignees,
      resolvedForTiming,
      recentTickets,
      responseSamples,
    ] = await Promise.all([
      prisma.supportTicket.count({ where: { ...schoolWhere, createdAt: { gte: monthStart } } }),
      prisma.supportTicket.count({
        where: { ...schoolWhere, status: { in: ["RESOLVED", "CLOSED"] }, resolvedAt: { gte: monthStart } },
      }),
      prisma.supportTicket.count({
        where: {
          ...schoolWhere,
          createdAt: { gte: monthStart },
          status: { in: ["RESOLVED", "CLOSED"] },
        },
      }),
      prisma.supportTicket.count({ where: { ...schoolWhere, status: { in: ["OPEN", "REOPENED"] } } }),
      prisma.supportTicket.count({
        where: { ...schoolWhere, status: { in: ["ASSIGNED", "IN_PROGRESS", "WAITING"] } },
      }),
      prisma.supportTicket.count({
        where: { ...schoolWhere, priority: "URGENT", status: { in: [...ACTIVE_STATUSES] } },
      }),
      prisma.supportTicket.count({
        where: { ...schoolWhere, assignedToId: null, status: { in: [...ACTIVE_STATUSES] } },
      }),
      prisma.supportTicket.count({
        where: { ...schoolWhere, status: "WAITING", updatedAt: { lte: waitingCutoff } },
      }),
      prisma.supportTicket.count({
        where: {
          ...schoolWhere,
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          },
        },
      }),
      prisma.supportTicket.groupBy({
        by: ["type"],
        where: { ...schoolWhere, createdAt: { gte: monthStart } },
        _count: { _all: true },
      }),
      prisma.supportTicket.groupBy({
        by: ["assignedToId"],
        where: {
          ...schoolWhere,
          assignedToId: { not: null },
          status: { in: [...ACTIVE_STATUSES] },
        },
        _count: { _all: true },
      }),
      prisma.supportTicket.findMany({
        where: {
          ...schoolWhere,
          resolvedAt: { not: null, gte: monthStart },
        },
        select: { createdAt: true, resolvedAt: true },
      }),
      prisma.supportTicket.findMany({
        where: { ...schoolWhere, createdAt: { gte: new Date(now.getTime() - 13 * 86_400_000) } },
        select: { createdAt: true, resolvedAt: true },
      }),
      prisma.supportTicket.findMany({
        where: { ...schoolWhere, createdAt: { gte: monthStart } },
        select: {
          createdAt: true,
          messages: {
            where: { isInternal: false },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      }),
    ]);

    const staffIds = assignees
      .map((row) => row.assignedToId)
      .filter((id): id is string => Boolean(id));

    const staff = staffIds.length
      ? await prisma.user.findMany({
          where: { id: { in: staffIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];

    const names = new Map(
      staff.map((person) => [
        person.id,
        [person.firstName, person.lastName].filter(Boolean).join(" ").trim() || "Staff",
      ]),
    );

    const resolutionHours = resolvedForTiming
      .filter((ticket) => ticket.resolvedAt)
      .map((ticket) => (ticket.resolvedAt!.getTime() - ticket.createdAt.getTime()) / 3_600_000);

    const averageResolutionHours =
      resolutionHours.length > 0
        ? Math.round((resolutionHours.reduce((sum, hours) => sum + hours, 0) / resolutionHours.length) * 10) / 10
        : null;
    const responseHours = responseSamples
      .filter((ticket) => ticket.messages[0])
      .map((ticket) => (ticket.messages[0]!.createdAt.getTime() - ticket.createdAt.getTime()) / 3_600_000);
    const averageResponseHours = responseHours.length
      ? Math.round((responseHours.reduce((sum, hours) => sum + hours, 0) / responseHours.length) * 10) / 10
      : null;

    const resolutionRate =
      totalThisMonth > 0 ? Math.round((resolvedCreatedThisMonth / totalThisMonth) * 1000) / 10 : 0;
    const dailyTrend = Array.from({ length: 14 }, (_, index) => {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - index));
      const next = new Date(day.getTime() + 86_400_000);
      return {
        date: day.toISOString().slice(0, 10),
        created: recentTickets.filter((ticket) => ticket.createdAt >= day && ticket.createdAt < next).length,
        resolved: recentTickets.filter((ticket) => ticket.resolvedAt && ticket.resolvedAt >= day && ticket.resolvedAt < next).length,
      };
    });

    return ApiResponse.success({
      attention: { open, active, urgent, unassigned, waitingOverTwoDays, newToday },
      month: {
        total: totalThisMonth,
        resolved: resolvedCreatedThisMonth,
        pending: Math.max(totalThisMonth - resolvedCreatedThisMonth, 0),
        resolvedThroughput: resolvedThisMonth,
        resolutionRate,
        averageResolutionHours,
        averageResponseHours,
      },
      byType: byType
        .map((row) => ({ type: row.type, count: row._count._all }))
        .sort((a, b) => b.count - a.count),
      staffWorkload: assignees
        .filter((row) => row.assignedToId)
        .map((row) => ({
          userId: row.assignedToId!,
          name: names.get(row.assignedToId!) ?? "Staff",
          active: row._count._all,
        }))
        .sort((a, b) => b.active - a.active),
      dailyTrend,
    });
  });
}
