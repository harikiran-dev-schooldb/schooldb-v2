import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/access-control";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tenant = await requirePermission(PERMISSIONS.FEE_READ);
  const rows = await prisma.studentFeeInstallment.findMany({
    where: { studentFeeItem: { studentFee: { schoolId: tenant.schoolId, active: true } } },
    select: { name: true, sequence: true },
    distinct: ["name"],
    orderBy: [{ sequence: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ success: true, data: rows.map((row) => row.name) });
}
