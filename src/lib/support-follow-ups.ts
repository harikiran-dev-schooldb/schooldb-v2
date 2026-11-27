import { prisma } from "@/lib/prisma";
import { isRouteAllowed } from "@/lib/route-access";
import { sendSupportPush, supportAdminUserIds } from "@/lib/support-push";

// Only administrator-scheduled dates are eligible. No parent messages or personal data.
export async function sendDueSupportFollowUps(now = new Date()) {
  const due = await prisma.supportTicket.findMany({
    where: { followUpAt: { lte: now }, followUpNotifiedAt: null, status: { notIn: ["RESOLVED", "CLOSED"] } },
    orderBy: [{ followUpAt: "asc" }, { id: "asc" }], take: 25,
    select: { id: true, schoolId: true, ticketNo: true, followUpAt: true, priority: true,
      school: { select: { routeAccessRestricted: true, allowedRoutes: true, moduleAccessRestricted: true } } },
  });
  let claimed = 0;
  for (const ticket of due) {
    if (!ticket.followUpAt || !isRouteAllowed(ticket.school, "queries")) continue;
    const recipients = await supportAdminUserIds(ticket.schoolId);
    if (!recipients.length) continue;
    const result = await prisma.supportTicket.updateMany({
      where: { id: ticket.id, schoolId: ticket.schoolId, followUpAt: ticket.followUpAt, followUpNotifiedAt: null, status: { notIn: ["RESOLVED", "CLOSED"] } },
      data: { followUpNotifiedAt: now },
    });
    if (!result.count) continue;
    try {
      await sendSupportPush({ schoolId: ticket.schoolId, userIds: recipients,
        ticketId: ticket.id, ticketNo: ticket.ticketNo, title: "Support follow-up due",
        body: "A scheduled support follow-up is due. Open the ticket to review.",
        priority: ticket.priority, eventKey: "FOLLOW_UP:" + ticket.followUpAt.toISOString() });
      claimed++;
    } catch (error) {
      await prisma.supportTicket.updateMany({
        where: { id: ticket.id, schoolId: ticket.schoolId, followUpAt: ticket.followUpAt, followUpNotifiedAt: now },
        data: { followUpNotifiedAt: null },
      });
      console.error("Support follow-up dispatch failed", error);
    }
  }
  return { remindersDispatched: claimed };
}
