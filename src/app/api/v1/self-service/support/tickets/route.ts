import { randomUUID } from "node:crypto";
import { SupportTicketStatus, SupportTicketType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { listAccessibleStudents, requireStudentAccess } from "@/lib/student-access";
import { sendSupportPush, supportAdminUserIds } from "@/lib/support-push";

const createInput = z.object({
  studentId: z.string().trim().min(1),
  subject: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(5000),
  type: z.enum(SupportTicketType),
});

export async function GET(request: Request) {
  return apiHandler(async () => {
    const { membership, students } = await listAccessibleStudents();
    const url = new URL(request.url);
    const requestedStudentId = url.searchParams.get("studentId")?.trim() || null;
    const page = Math.max(Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1, 1);
    const pageSize = Math.min(
      Math.max(Number.parseInt(url.searchParams.get("pageSize") ?? "25", 10) || 25, 10),
      100,
    );

    if (requestedStudentId) {
      await requireStudentAccess(undefined, requestedStudentId);
    }

    const accessibleStudentIds = requestedStudentId
      ? [requestedStudentId]
      : students.map((student) => student.id);

    const where: Prisma.SupportTicketWhereInput = {
      schoolId: membership.schoolId,
      createdById: membership.userId,
      ...(accessibleStudentIds.length ? { studentId: { in: accessibleStudentIds } } : {}),
    };

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          ticketNo: true,
          subject: true,
          description: true,
          type: true,
          priority: true,
          status: true,
          studentId: true,
          assignedToId: true,
          createdAt: true,
          updatedAt: true,
          resolvedAt: true,
          student: {
            select: { id: true, admissionNo: true, fullName: true },
          },
          assignedTo: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return ApiResponse.success({
      tickets,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total,
      },
    });
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const input = createInput.safeParse(await request.json());
    if (!input.success) {
      throw new ApiError(400, "Enter a student, subject, description and valid ticket type.");
    }

    const { membership } = await requireStudentAccess(undefined, input.data.studentId);

    const ticket = await prisma.$transaction(async (tx) => {
      const created = await tx.supportTicket.create({
        data: {
          schoolId: membership.schoolId,
          ticketNo: `TCK-${randomUUID().slice(0, 12).toUpperCase()}`,
          subject: input.data.subject,
          description: input.data.description,
          type: input.data.type,
          priority: "NORMAL",
          studentId: input.data.studentId,
          createdById: membership.userId,
          source: membership.role,
        },
      });

      await tx.supportTicketActivity.create({
        data: {
          schoolId: membership.schoolId,
          ticketId: created.id,
          actorId: membership.userId,
          action: "CREATED",
          detail: `Ticket created by ${membership.role.toLowerCase()}`,
        },
      });

      return created;
    });

    await sendSupportPush({
      schoolId: membership.schoolId,
      userIds: await supportAdminUserIds(membership.schoolId),
      excludeUserId: membership.userId,
      title: "New family support ticket",
      body: `${ticket.ticketNo} · ${ticket.subject}`,
      ticketId: ticket.id,
      ticketNo: ticket.ticketNo,
    }).catch((error) => console.error("Support push failed", error));

    return ApiResponse.success(ticket, "Ticket created", 201);
  });
}
