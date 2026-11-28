import { prisma } from "@/lib/prisma";
import { isRouteAllowed } from "@/lib/route-access";
import { hasModuleAccess } from "@/lib/staff-permissions";
import { parseSupportAutomation } from "@/lib/support-automation";
import { RESOLUTION_HOURS } from "@/lib/support-sla";
import { sendSupportPush, supportAdminUserIds } from "@/lib/support-push";
import { SupportTicketPriority } from "@/generated/prisma/enums";

export async function sendOverdueSupportEscalations(now = new Date()) {
  const schools = await prisma.school.findMany({
    select: { id: true, supportAutomation: true, routeAccessRestricted: true, moduleAccessRestricted: true, allowedRoutes: true },
  });
  let dispatched = 0;
  for (const school of schools) {
    if (dispatched >= 25) break;
    const config = parseSupportAutomation(school.supportAutomation);
    if (!config.escalationEnabled || !isRouteAllowed(school, "queries")) continue;
    const recipients = new Set(await supportAdminUserIds(school.id));
    if (config.escalationRecipientId) {
      const member = await prisma.membership.findFirst({
        where: { schoolId: school.id, userId: config.escalationRecipientId, isActive: true, role: { notIn: ["PARENT", "STUDENT"] } },
        select: { userId: true, role: true, customPermissionsEnabled: true, permissions: true },
      });
      if (member && hasModuleAccess(member, "SUPPORT", "MANAGE")) recipients.add(member.userId);
    }
    if (!recipients.size) continue;
    const overdue = await prisma.supportTicket.findMany({
      where: { schoolId: school.id, slaEscalatedAt: null, status: { notIn: ["RESOLVED", "CLOSED"] },
        OR: Object.values(SupportTicketPriority).map(priority => ({
          priority, createdAt: { lt: new Date(now.getTime() - (RESOLUTION_HOURS[priority] + config.escalationGraceHours) * 3600000) },
        })),
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 25 - dispatched,
      select: { id: true, ticketNo: true, priority: true, updatedAt: true },
    });
    for (const ticket of overdue) {
      const claim = await prisma.supportTicket.updateMany({
        where: { id: ticket.id, schoolId: school.id, slaEscalatedAt: null, updatedAt: ticket.updatedAt, status: { notIn: ["RESOLVED", "CLOSED"] } },
        data: { slaEscalatedAt: now, updatedAt: ticket.updatedAt },
      });
      if (!claim.count) continue;
      try {
        await sendSupportPush({ schoolId: school.id, userIds: [...recipients], title: "Support SLA overdue",
          body: "A support ticket has exceeded its resolution deadline. Review the ticket.",
          ticketId: ticket.id, ticketNo: ticket.ticketNo, priority: ticket.priority, eventKey: "SLA_ESCALATION" });
        dispatched++;
      } catch (error) {
        await prisma.supportTicket.updateMany({
          where: { id: ticket.id, schoolId: school.id, slaEscalatedAt: now, updatedAt: ticket.updatedAt },
          data: { slaEscalatedAt: null, updatedAt: ticket.updatedAt },
        });
        console.error("Support SLA escalation dispatch failed", error);
      }
    }
  }
  return { escalationsDispatched: dispatched };
}
