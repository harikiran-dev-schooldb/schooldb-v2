import { ApiError } from "@/lib/errors";
import { requireTenant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function supportActor() {
  const membership = await requireTenant();
  return {
    schoolId: membership.schoolId,
    userId: membership.userId,
    isAdmin: ["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(membership.role),
  };
}

export function ticketVisibility(actor: Awaited<ReturnType<typeof supportActor>>) {
  return actor.isAdmin
    ? { schoolId: actor.schoolId }
    : { schoolId: actor.schoolId, OR: [{ createdById: actor.userId }, { assignedToId: actor.userId }] };
}

export async function visibleTicket(id: string, actor: Awaited<ReturnType<typeof supportActor>>) {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id, ...ticketVisibility(actor) },
    include: {
      student: { select: { id: true, admissionNo: true, fullName: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });
  if (!ticket) throw new ApiError(404, "Ticket not found");
  return ticket;
}
