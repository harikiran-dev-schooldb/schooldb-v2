import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { supportActor, visibleTicket } from "@/lib/support-tickets";

type Context = { params: Promise<{ id: string }> };
const inputSchema = z.object({ body: z.string().trim().min(1).max(5000) });

export async function POST(request: Request, context: Context) {
  return apiHandler(async () => {
    const actor = await supportActor();
    const ticket = await visibleTicket((await context.params).id, actor);
    if (ticket.status === "CLOSED") throw new ApiError(400, "Closed tickets cannot receive replies.");
    const input = inputSchema.safeParse(await request.json());
    if (!input.success) throw new ApiError(400, "Enter a reply of up to 5000 characters.");
    const message = await prisma.supportTicketMessage.create({
      data: { schoolId: actor.schoolId, ticketId: ticket.id, authorId: actor.userId, body: input.data.body },
    });
    return ApiResponse.success(message, "Reply added", 201);
  });
}
