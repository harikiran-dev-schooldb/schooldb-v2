import type { SupportTicketPriority, SupportTicketStatus } from "@/generated/prisma/enums";

const RESPONSE_HOURS: Record<SupportTicketPriority, number> = {
  LOW: 48,
  NORMAL: 24,
  HIGH: 8,
  URGENT: 4,
};

const RESOLUTION_HOURS: Record<SupportTicketPriority, number> = {
  LOW: 120,
  NORMAL: 72,
  HIGH: 48,
  URGENT: 24,
};

export function supportSla(input: {
  createdAt: Date;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  firstResponseAt?: Date | null;
  resolvedAt?: Date | null;
}, now = new Date()) {
  const responseDueAt = new Date(input.createdAt.getTime() + RESPONSE_HOURS[input.priority] * 3_600_000);
  const resolutionDueAt = new Date(input.createdAt.getTime() + RESOLUTION_HOURS[input.priority] * 3_600_000);
  const terminal = input.status === "RESOLVED" || input.status === "CLOSED";
  const responseState = input.firstResponseAt
    ? input.firstResponseAt <= responseDueAt ? "MET" : "BREACHED"
    : now > responseDueAt ? "OVERDUE" : "DUE";
  const resolutionState = terminal
    ? input.resolvedAt && input.resolvedAt <= resolutionDueAt ? "MET" : "BREACHED"
    : now > resolutionDueAt ? "OVERDUE" : "DUE";
  return { responseDueAt, resolutionDueAt, responseState, resolutionState } as const;
}
