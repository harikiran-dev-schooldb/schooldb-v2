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
  const installmentName = searchParams.get("installmentName") || undefined;

  const where: Prisma.FeePaymentWhereInput = {
    schoolId: tenant.schoolId,
    status: "SUCCESS",
    ...(paymentMode ? { paymentMode: paymentMode as "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" } : {}),
    ...(fromDate || toDate ? { paymentDate: { ...(fromDate ? { gte: new Date(`${fromDate}T00:00:00.000Z`) } : {}), ...(toDate ? { lte: new Date(`${toDate}T23:59:59.999Z`) } : {}) } } : {}),
    ...(installmentName ? { allocations: { some: { studentFeeInstallment: { name: installmentName } } } } : {}),
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
        receiptNo: true, paymentDate: true, paymentMode: true, referenceNo: true, remarks: true,
        studentEnrollment: { select: { student: { select: { fullName: true, admissionNo: true } }, class: { select: { name: true } }, section: { select: { name: true } } } },
        allocations: {
          where: installmentName ? { studentFeeInstallment: { name: installmentName } } : undefined,
          select: {
            amount: true,
            studentFeeInstallment: {
              select: { name: true, studentFeeItem: { select: { feeCategory: { select: { name: true } } } } },
            },
          },
        },
      },
    }),
  ]);
  if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

  const rows = payments.flatMap((payment) =>
    payment.allocations.map((allocation) => ({
      receiptNo: payment.receiptNo,
      paymentDate: payment.paymentDate,
      admissionNo: payment.studentEnrollment.student.admissionNo,
      studentName: payment.studentEnrollment.student.fullName,
      className: payment.studentEnrollment.class.name,
      sectionName: payment.studentEnrollment.section.name,
      installmentName: allocation.studentFeeInstallment.name,
      feeCategory: allocation.studentFeeInstallment.studentFeeItem.feeCategory.name,
      amount: Number(allocation.amount),
      paymentMode: payment.paymentMode,
      referenceNo: payment.referenceNo,
      remarks: payment.remarks,
    })),
  );
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const workbook = await createSchoolReportWorkbook({
    schoolName: school.name,
    reportName: installmentName ? `Fee Collection Report - ${installmentName}` : "Fee Collection Report",
    periodLabel: reportDateRange(fromDate, toDate),
    sheetName: "Fee Collection",
    rows,
    columns: [
      { header: "S.No", key: "serial", width: 8, value: (_row, index) => index + 1 },
      { header: "Receipt No", key: "receiptNo", width: 24, value: (row) => row.receiptNo },
      { header: "Payment Date", key: "paymentDate", width: 16, value: (row) => row.paymentDate, numFmt: "dd-mm-yyyy" },
      { header: "Admission No", key: "admissionNo", width: 16, value: (row) => row.admissionNo },
      { header: "Student Name", key: "studentName", width: 30, value: (row) => row.studentName },
      { header: "Class", key: "class", width: 12, value: (row) => row.className },
      { header: "Section", key: "section", width: 10, value: (row) => row.sectionName },
      { header: "Installment / Term", key: "installment", width: 22, value: (row) => row.installmentName },
      { header: "Fee Category", key: "feeCategory", width: 22, value: (row) => row.feeCategory },
      { header: "Allocated Amount", key: "amount", width: 18, value: (row) => row.amount, numFmt: "₹#,##0.00" },
      { header: "Payment Mode", key: "paymentMode", width: 18, value: (row) => row.paymentMode.replaceAll("_", " ") },
      { header: "Reference No", key: "referenceNo", width: 22, value: (row) => row.referenceNo },
      { header: "Remarks", key: "remarks", width: 32, value: (row) => row.remarks },
    ],
  });
  const sheet = workbook.getWorksheet("Fee Collection");
  if (sheet) {
    const row = sheet.getRow(rows.length + 7);
    row.getCell(9).value = "TOTAL";
    row.getCell(9).font = { bold: true };
    row.getCell(10).value = total;
    row.getCell(10).numFmt = "₹#,##0.00";
    row.getCell(10).font = { bold: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${safeReportFilename(school.name)}-fee-collection-report.xlsx"`,
    "Cache-Control": "no-store",
  } });
}
