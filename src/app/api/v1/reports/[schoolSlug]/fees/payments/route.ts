import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import { PERMISSIONS } from "@/lib/access-control";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSchoolReportWorkbook, reportDateRange, safeReportFilename } from "@/lib/reports/excel";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const tenant = await requirePermission(PERMISSIONS.FEE_READ);
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search")?.trim() || undefined;
  const paymentMode = searchParams.get("paymentMode") || undefined;
  const fromDate = searchParams.get("fromDate") || undefined;
  const toDate = searchParams.get("toDate") || undefined;

  const where: Prisma.FeePaymentWhereInput = {
    schoolId: tenant.schoolId,
    status: "SUCCESS",
    ...(paymentMode ? { paymentMode: paymentMode as "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" } : {}),
    ...(fromDate || toDate ? { paymentDate: { ...(fromDate ? { gte: new Date(`${fromDate}T00:00:00.000Z`) } : {}), ...(toDate ? { lte: new Date(`${toDate}T23:59:59.999Z`) } : {}) } } : {}),
    ...(search ? { OR: [
      { receiptNo: { contains: search, mode: "insensitive" } },
      { studentEnrollment: { student: { fullName: { contains: search, mode: "insensitive" } } } },
      { studentEnrollment: { student: { admissionNo: { contains: search, mode: "insensitive" } } } },
    ] } : {}),
  };

  const [school, payments] = await Promise.all([
    prisma.school.findFirst({ where: { id: tenant.schoolId, slug: schoolSlug }, select: { name: true } }),
    prisma.feePayment.findMany({
      where,
      orderBy: [{ paymentDate: "asc" }, { receiptNo: "asc" }],
      select: {
        receiptNo: true, paymentDate: true, amount: true, paymentMode: true, referenceNo: true, remarks: true,
        studentEnrollment: { select: { student: { select: { fullName: true, admissionNo: true } }, class: { select: { name: true } }, section: { select: { name: true } } } },
      },
    }),
  ]);
  if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

  const rows = payments.map((payment) => ({ ...payment, amountValue: Number(payment.amount) }));
  const total = rows.reduce((sum, row) => sum + row.amountValue, 0);
  const workbook = await createSchoolReportWorkbook({
    schoolName: school.name,
    reportName: "Fee Collection Report",
    periodLabel: reportDateRange(fromDate, toDate),
    sheetName: "Fee Collection",
    rows,
    columns: [
      { header: "S.No", key: "serial", width: 8, value: (_row, index) => index + 1 },
      { header: "Receipt No", key: "receiptNo", width: 24, value: (row) => row.receiptNo },
      { header: "Payment Date", key: "paymentDate", width: 16, value: (row) => row.paymentDate, numFmt: "dd-mm-yyyy" },
      { header: "Admission No", key: "admissionNo", width: 16, value: (row) => row.studentEnrollment.student.admissionNo },
      { header: "Student Name", key: "studentName", width: 30, value: (row) => row.studentEnrollment.student.fullName },
      { header: "Class", key: "class", width: 12, value: (row) => row.studentEnrollment.class.name },
      { header: "Section", key: "section", width: 10, value: (row) => row.studentEnrollment.section.name },
      { header: "Amount", key: "amount", width: 16, value: (row) => row.amountValue, numFmt: "₹#,##0.00" },
      { header: "Payment Mode", key: "paymentMode", width: 18, value: (row) => row.paymentMode.replaceAll("_", " ") },
      { header: "Reference No", key: "referenceNo", width: 22, value: (row) => row.referenceNo },
      { header: "Remarks", key: "remarks", width: 32, value: (row) => row.remarks },
    ],
  });
  const sheet = workbook.getWorksheet("Fee Collection");
  if (sheet) {
    const row = sheet.getRow(rows.length + 7);
    row.getCell(7).value = "TOTAL";
    row.getCell(7).font = { bold: true };
    row.getCell(8).value = total;
    row.getCell(8).numFmt = "₹#,##0.00";
    row.getCell(8).font = { bold: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${safeReportFilename(school.name)}-fee-collection-report.xlsx"`,
    "Cache-Control": "no-store",
  } });
}
