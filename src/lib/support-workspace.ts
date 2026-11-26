import type { Prisma } from "@/generated/prisma/client";

export const unresolvedSupport: Prisma.SupportTicketWhereInput = {
  status: { notIn: ["RESOLVED", "CLOSED"] },
};

export function personalSupportFilters(userId: string, now = new Date()) {
  const assigned: Prisma.SupportTicketWhereInput = { ...unresolvedSupport, assignedToId: userId };
  const raised: Prisma.SupportTicketWhereInput = { ...unresolvedSupport, createdById: userId };
  const overdue: Prisma.SupportTicketWhereInput = {
    ...assigned,
    OR: [
      { priority: "URGENT", createdAt: { lt: new Date(now.getTime() - 24 * 3_600_000) } },
      { priority: "HIGH", createdAt: { lt: new Date(now.getTime() - 48 * 3_600_000) } },
      { priority: "NORMAL", createdAt: { lt: new Date(now.getTime() - 72 * 3_600_000) } },
      { priority: "LOW", createdAt: { lt: new Date(now.getTime() - 120 * 3_600_000) } },
    ],
  };
  return { assigned, raised, overdue };
}
