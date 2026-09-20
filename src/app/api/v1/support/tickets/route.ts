import { randomUUID } from "node:crypto";
import { SupportTicketPriority, SupportTicketStatus, SupportTicketType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { supportActor, ticketVisibility } from "@/lib/support-tickets";
import { sendSupportPush, supportAdminUserIds } from "@/lib/support-push";

const createInput = z.object({
  subject: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(5000),
  type: z.enum(SupportTicketType),
  priority: z.enum(SupportTicketPriority).default("NORMAL"),
  studentId: z.string().trim().min(1).nullable().optional(),
});

export async function GET(request: Request) {
  return apiHandler(async () => {
    const actor = await supportActor();
    const visibility = ticketVisibility(actor);
    const url = new URL(request.url);
    const filter = url.searchParams.get("filter")?.toUpperCase() ?? "ALL";
    const q = url.searchParams.get("q")?.trim().slice(0, 100) ?? "";
    const page = Math.max(Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1, 1);
    const pageSize = Math.min(Math.max(Number.parseInt(url.searchParams.get("pageSize") ?? "25", 10) || 25, 10), 100);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const waitingCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const filterWhere: Prisma.SupportTicketWhereInput =
      filter === "OPEN" ? { status: { in: [SupportTicketStatus.OPEN, SupportTicketStatus.REOPENED] } } :
      filter === "ACTIVE" ? { status: { in: [SupportTicketStatus.ASSIGNED, SupportTicketStatus.IN_PROGRESS, SupportTicketStatus.WAITING] } } :
      filter === "WAITING" ? { status: SupportTicketStatus.WAITING } :
      filter === "WAITING_OVERDUE" ? { status: SupportTicketStatus.WAITING, updatedAt: { lte: waitingCutoff } } :
      filter === "URGENT" ? { priority: SupportTicketPriority.URGENT, status: { notIn: [SupportTicketStatus.RESOLVED, SupportTicketStatus.CLOSED] } } :
      filter === "UNASSIGNED" ? { assignedToId: null, status: { notIn: [SupportTicketStatus.RESOLVED, SupportTicketStatus.CLOSED] } } :
      filter === "NEW_TODAY" ? { createdAt: { gte: startOfToday } } :
      filter === "RESOLVED" ? { status: { in: [SupportTicketStatus.RESOLVED, SupportTicketStatus.CLOSED] } } : {};
    const searchWhere: Prisma.SupportTicketWhereInput = q
      ? {
          OR: [
            { ticketNo: { contains: q, mode: "insensitive" } },
            { subject: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { student: { is: { fullName: { contains: q, mode: "insensitive" } } } },
            { student: { is: { admissionNo: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {};
    const where: Prisma.SupportTicketWhereInput = { ...visibility, ...filterWhere, ...searchWhere };
    const [tickets, total, open, inProgress, urgent, resolved] = await Promise.all([
      prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
      include: { student: { select: { id: true, admissionNo: true, fullName: true } } },
      }),
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.count({ where: { ...visibility, status: { in: ["OPEN", "REOPENED"] } } }),
      prisma.supportTicket.count({ where: { ...visibility, status: { in: ["ASSIGNED", "IN_PROGRESS", "WAITING"] } } }),
      prisma.supportTicket.count({ where: { ...visibility, priority: "URGENT", status: { notIn: ["RESOLVED", "CLOSED"] } } }),
      prisma.supportTicket.count({ where: { ...visibility, status: { in: ["RESOLVED", "CLOSED"] } } }),
    ]);
    return ApiResponse.success({
      tickets,
      isAdmin: actor.isAdmin,
      summary: { open, inProgress, urgent, resolved },
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize), hasMore: page * pageSize < total },
    });
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const actor = await supportActor();
    const input = createInput.safeParse(await request.json());
    if (!input.success) throw new ApiError(400, "Enter a subject, description and valid ticket type.");
    if (input.data.type === "STUDENT" && !input.data.studentId)
      throw new ApiError(400, "Select a student for a student ticket.");
    if (input.data.type !== "STUDENT" && input.data.studentId)
      throw new ApiError(400, "Only student tickets can reference a student.");
    if (input.data.studentId) {
      const student = await prisma.student.findFirst({ where: { id: input.data.studentId, schoolId: actor.schoolId }, select: { id: true } });
      if (!student) throw new ApiError(400, "Student not found in this school.");
    }
    const ticket = await prisma.$transaction(async (tx) => {
      const created = await tx.supportTicket.create({
        data: {
          schoolId: actor.schoolId,
          ticketNo: `TCK-${randomUUID().slice(0, 12).toUpperCase()}`,
          subject: input.data.subject,
          description: input.data.description,
          type: input.data.type,
          priority: input.data.priority,
          studentId: input.data.studentId || null,
          createdById: actor.userId,
        },
      });
      await tx.supportTicketActivity.create({
        data: {
          schoolId: actor.schoolId, ticketId: created.id, actorId: actor.userId,
          action: "CREATED", detail: "Ticket created",
        },
      });
      return created;
    });

    const adminIds = await supportAdminUserIds(actor.schoolId);
    await sendSupportPush({
      schoolId: actor.schoolId,
      userIds: adminIds,
      excludeUserId: actor.userId,
      title: input.data.priority === "URGENT" ? "Urgent support ticket" : "New support ticket",
      body: `${ticket.ticketNo} · ${ticket.subject}`,
      ticketId: ticket.id,
      ticketNo: ticket.ticketNo,
    }).catch((error) => console.error("Support push failed", error));

    return ApiResponse.success(ticket, "Ticket created", 201);
  });
}
