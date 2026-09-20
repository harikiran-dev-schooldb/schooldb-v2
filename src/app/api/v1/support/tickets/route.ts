import { randomUUID } from "node:crypto";
import { SupportTicketPriority, SupportTicketType } from "@/generated/prisma/enums";
import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { supportActor, ticketVisibility } from "@/lib/support-tickets";

const createInput = z.object({
  subject: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(5000),
  type: z.enum(SupportTicketType),
  priority: z.enum(SupportTicketPriority).default("NORMAL"),
  studentId: z.string().trim().min(1).nullable().optional(),
});

export async function GET() {
  return apiHandler(async () => {
    const actor = await supportActor();
    const where = ticketVisibility(actor);
    const [tickets, open, inProgress, urgent, resolved] = await Promise.all([
      prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: "desc" }, take: 100,
      include: { student: { select: { id: true, admissionNo: true, fullName: true } } },
      }),
      prisma.supportTicket.count({ where: { ...where, status: { in: ["OPEN", "REOPENED"] } } }),
      prisma.supportTicket.count({ where: { ...where, status: { in: ["ASSIGNED", "IN_PROGRESS", "WAITING"] } } }),
      prisma.supportTicket.count({ where: { ...where, priority: "URGENT", status: { not: "CLOSED" } } }),
      prisma.supportTicket.count({ where: { ...where, status: "RESOLVED" } }),
    ]);
    return ApiResponse.success({ tickets, isAdmin: actor.isAdmin, summary: { open, inProgress, urgent, resolved } });
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
    const ticket = await prisma.supportTicket.create({
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
    return ApiResponse.success(ticket, "Ticket created", 201);
  });
}
