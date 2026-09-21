import { z } from "zod";

import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { listAccessibleStudents } from "@/lib/student-access";
import { sendSupportPush, supportAdminUserIds } from "@/lib/support-push";

type Context = { params: Promise<{ id: string }> };

const inputSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

export async function POST(request: Request, context: Context) {
  return apiHandler(async () => {
    const { membership, students } = await listAccessibleStudents();
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: (await context.params).id,
        schoolId: membership.schoolId,
        createdById: membership.userId,
        studentId: { in: students.map((student) => student.id) },
      },
      select: {
        id: true,
        ticketNo: true,
        subject: true,
        status: true,
        assignedToId: true,
      },
    });
    if (!ticket) throw new ApiError(404, "Ticket not found");
    if (ticket.status === "CLOSED") {
      throw new ApiError(400, "Closed tickets cannot receive replies.");
    }
    if (ticket.status === "RESOLVED") {
      throw new ApiError(
        400,
        "Reopen the resolved ticket before adding another reply.",
      );
    }

    const input = inputSchema.safeParse(await request.json());
    if (!input.success) {
      throw new ApiError(400, "Enter a reply of up to 5000 characters.");
    }

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.supportTicketMessage.create({
        data: {
          schoolId: membership.schoolId,
          ticketId: ticket.id,
          authorId: membership.userId,
          body: input.data.body,
          isInternal: false,
        },
      });

      await tx.supportTicketActivity.create({
        data: {
          schoolId: membership.schoolId,
          ticketId: ticket.id,
          actorId: membership.userId,
          action: "REPLY_ADDED",
          detail: "Requester added a reply",
        },
      });

      return created;
    });

    const recipients = new Set<string>(await supportAdminUserIds(membership.schoolId));
    if (ticket.assignedToId) recipients.add(ticket.assignedToId);

    await sendSupportPush({
      schoolId: membership.schoolId,
      userIds: [...recipients],
      excludeUserId: membership.userId,
      title: `Reply · ${ticket.ticketNo}`,
      body:
        input.data.body.length > 120
          ? input.data.body.slice(0, 117) + "..."
          : input.data.body,
      ticketId: ticket.id,
      ticketNo: ticket.ticketNo,
    }).catch((error) => console.error("Support push failed", error));

    return ApiResponse.success(message, "Reply added", 201);
  });
}
