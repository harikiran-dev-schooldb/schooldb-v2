import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { parentSupportSchool, searchParentSupportStudents } from "@/lib/parent-support";
import { requireParentSupportVerification } from "@/lib/parent-support-verification";
import { consumeRateLimit, requestIp } from "@/lib/rate-limit";
import { requireSchoolSlug } from "@/lib/tenant-context";
import type { Prisma } from "@/generated/prisma/client";

type Context = { params: Promise<{ schoolSlug: string }> };

async function scope(request: Request, context: Context): Promise<Prisma.SupportTicketWhereInput> {
  const schoolSlug = requireSchoolSlug((await context.params).schoolSlug);
  const school = await parentSupportSchool(schoolSlug);
  const verification = await requireParentSupportVerification(request, school.id);
  if (!verification) throw new ApiError(401, "Verify your registered number to view your queries.");
  const limit = await consumeRateLimit("parent-support-tracking", school.id + ":" + (requestIp(request) || "unknown"), 30, 15 * 60 * 1000);
  if (!limit.allowed) throw new ApiError(429, "Too many requests. Please try again later.");
  const students = await searchParentSupportStudents({ schoolSlug, mobile: verification.phone });
  return { schoolId: school.id, source: "PARENT_QR", parentPhone: verification.phone, studentId: { in: students.map((student) => student.id) } };
}

export async function GET(request: Request, context: Context) {
  return apiHandler(async () => {
    const where = await scope(request, context);
    const tickets = await prisma.supportTicket.findMany({
      where, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 50,
      select: {
        ticketNo: true, subject: true, status: true, createdAt: true, updatedAt: true, resolvedAt: true, parentConfirmedAt: true,
        messages: { where: { isInternal: false }, select: { body: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    const response = ApiResponse.success(tickets);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  });
}

export async function POST(request: Request, context: Context) {
  return apiHandler(async () => {
    const where = await scope(request, context);
    const parsed = z.object({ ticketNo: z.string().trim().min(1).max(100) }).safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Choose a resolved query.");
    const ticket = await prisma.supportTicket.findFirst({
      where: { AND: [where, { ticketNo: parsed.data.ticketNo, status: { in: ["RESOLVED", "CLOSED"] } }] },
      select: { id: true, resolvedAt: true, parentConfirmedAt: true },
    });
    if (!ticket) throw new ApiError(404, "Resolved query not available.");
    if (!ticket.parentConfirmedAt) {
      const result = await prisma.supportTicket.updateMany({
        where: { AND: [where, { id: ticket.id, resolvedAt: ticket.resolvedAt, status: { in: ["RESOLVED", "CLOSED"] }, parentConfirmedAt: null }] },
        data: { parentConfirmedAt: new Date() },
      });
      if (!result.count) throw new ApiError(409, "The query changed. Refresh and try again.");
    }
    const response = ApiResponse.success({ confirmed: true });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  });
}
