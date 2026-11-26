import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { supportActor, ticketVisibility } from "@/lib/support-tickets";

export async function GET() {
  return apiHandler(async () => {
    const actor = await supportActor();
    const visible = ticketVisibility(actor);
    const tickets = await prisma.supportTicket.findMany({
      where: visible,
      select: {
        id: true, ticketNo: true, subject: true, status: true, priority: true, updatedAt: true,
        reads: { where: { userId: actor.userId }, select: { readAt: true }, take: 1 },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    });
    const updates = tickets.map(({ reads, ...ticket }) => ({
      ...ticket,
      unread: !reads[0] || ticket.updatedAt > reads[0].readAt,
    }));
    const unreadCount = updates.filter((ticket) => ticket.unread).length;
    // Prioritize unread items; show the latest 50 visible ticket updates.
    const items = [...updates.filter((ticket) => ticket.unread), ...updates.filter((ticket) => !ticket.unread)].slice(0, 50);
    const response = ApiResponse.success({ unreadCount, items });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  });
}
