import { NextResponse } from "next/server";

import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VIEW_ROLES = new Set([
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "TEACHER",
  "ACCOUNTANT",
  "RECEPTIONIST",
]);

export async function GET(request: Request) {
  const schoolSlug = new URL(request.url).searchParams.get("schoolSlug");

  if (!schoolSlug) {
    return NextResponse.json({ error: "schoolSlug is required" }, { status: 400 });
  }

  const membership = await requireMembership(schoolSlug);

  if (!VIEW_ROLES.has(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tickets = await prisma.supportTicket.findMany({
    where: { schoolId: membership.schoolId },
    select: {
      updatedAt: true,
      reads: {
        where: { userId: membership.userId },
        select: { readAt: true },
        take: 1,
      },
    },
  });

  const count = tickets.reduce(
    (total, ticket) =>
      total + (!ticket.reads[0] || ticket.updatedAt > ticket.reads[0].readAt ? 1 : 0),
    0,
  );

  return NextResponse.json(
    { count },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
