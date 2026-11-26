import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { supportActor, ticketVisibility } from "@/lib/support-tickets";
import { personalSupportFilters } from "@/lib/support-workspace";

export async function GET() {
  return apiHandler(async () => {
    const actor = await supportActor();
    const visible = ticketVisibility(actor);
    const filters = personalSupportFilters(actor.userId);
    const [assigned, overdue, raised, tickets] = await Promise.all([
      prisma.supportTicket.count({ where: { AND: [visible, filters.assigned] } }),
      prisma.supportTicket.count({ where: { AND: [visible, filters.overdue] } }),
      prisma.supportTicket.count({ where: { AND: [visible, filters.raised] } }),
      prisma.supportTicket.findMany({
        where: { AND: [visible, filters.assigned] },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }, { id: "asc" }],
        take: 3,
        select: { id: true, ticketNo: true, subject: true, priority: true, status: true },
      }),
    ]);
    const response = ApiResponse.success({ assigned, overdue, raised, tickets });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  });
}
