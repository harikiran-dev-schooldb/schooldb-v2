import { NextRequest, NextResponse } from "next/server";
import type { FeePaymentMode, Prisma } from "@/generated/prisma/client";

import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_MODES,
} from "@/features/expenses/schema";
import { PERMISSIONS } from "@/lib/access-control";
import { recordAuditLog } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createSchoolReportWorkbook,
  reportDateRange,
  safeReportFilename,
} from "@/lib/reports/excel";
import {
  EXPORT_QUERY_ROW_LIMIT,
  exportRowLimitResponse,
} from "@/lib/reports/limits";

export const runtime = "nodejs";

const validCategories = new Set<string>(EXPENSE_CATEGORIES);
const validPaymentModes = new Set<string>(EXPENSE_PAYMENT_MODES);

function displayLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function dateFilter(value: string | null, end = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  const { schoolSlug } = await params;
  const membership = await requirePermission(PERMISSIONS.FEE_READ, schoolSlug);
  const query = request.nextUrl.searchParams;
  const from = query.get("from");
  const to = query.get("to");
  const requestedCategory = query.get("category")?.trim() || undefined;
  const category =
    requestedCategory && validCategories.has(requestedCategory)
      ? requestedCategory
      : undefined;
  const status = query.get("status");
  const requestedPaymentMode = query.get("paymentMode")?.trim() || undefined;
  const paymentMode =
    requestedPaymentMode && validPaymentModes.has(requestedPaymentMode)
      ? requestedPaymentMode
      : undefined;

  const where: Prisma.ExpenseWhereInput = {
    schoolId: membership.schoolId,
    ...(category ? { category } : {}),
    ...(status === "POSTED" || status === "VOID" ? { status } : {}),
    ...(paymentMode ? { paymentMode: paymentMode as FeePaymentMode } : {}),
    ...(from || to
      ? {
          expenseDate: {
            ...(dateFilter(from) ? { gte: dateFilter(from) } : {}),
            ...(dateFilter(to, true) ? { lte: dateFilter(to, true) } : {}),
          },
        }
      : {}),
  };

  const [school, expenses] = await Promise.all([
    prisma.school.findFirst({
      where: { id: membership.schoolId, slug: schoolSlug },
      select: { name: true },
    }),
    prisma.expense.findMany({
      where,
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      take: EXPORT_QUERY_ROW_LIMIT,
    }),
  ]);

  if (!school) {
    return NextResponse.json({ error: "School not found." }, { status: 404 });
  }
  const limitResponse = exportRowLimitResponse(
    expenses.length,
    "This expense ledger is too large for an immediate Excel download.",
  );
  if (limitResponse) return limitResponse;

  const userIds = [
    ...new Set(
      expenses.flatMap((expense) =>
        [expense.recordedBy, expense.voidedBy].filter(
          (id): id is string => Boolean(id),
        ),
      ),
    ),
  ];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
    : [];
  const userNames = new Map(
    users.map((user) => [
      user.id,
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email,
    ]),
  );

  const rows = expenses.map((expense) => ({
    ...expense,
    amountValue: Number(expense.amount),
    recordedByName: userNames.get(expense.recordedBy) || expense.recordedBy,
    voidedByName: expense.voidedBy
      ? userNames.get(expense.voidedBy) || expense.voidedBy
      : "",
  }));
  const workbook = await createSchoolReportWorkbook({
    schoolName: school.name,
    reportName: "Expense Ledger",
    periodLabel: reportDateRange(from || undefined, to || undefined),
    sheetName: "Expenses",
    rows,
    columns: [
      { header: "S.No", key: "serial", width: 8, value: (_row, index) => index + 1 },
      { header: "Expense Date", key: "expenseDate", width: 15, value: (row) => row.expenseDate, numFmt: "dd-mm-yyyy" },
      { header: "Description", key: "description", width: 34, value: (row) => row.description },
      { header: "Vendor", key: "vendor", width: 24, value: (row) => row.vendor },
      { header: "Category", key: "category", width: 18, value: (row) => displayLabel(row.category) },
      { header: "Payment Mode", key: "paymentMode", width: 18, value: (row) => displayLabel(row.paymentMode) },
      { header: "Reference No.", key: "referenceNo", width: 20, value: (row) => row.referenceNo },
      { header: "Amount", key: "amount", width: 16, value: (row) => row.amountValue, numFmt: "₹#,##0.00" },
      { header: "Status", key: "status", width: 12, value: (row) => row.status },
      { header: "Remarks", key: "remarks", width: 30, value: (row) => row.remarks },
      { header: "Recorded By", key: "recordedBy", width: 24, value: (row) => row.recordedByName },
      { header: "Recorded At", key: "createdAt", width: 20, value: (row) => row.createdAt, numFmt: "dd-mm-yyyy hh:mm" },
      { header: "Voided At", key: "voidedAt", width: 20, value: (row) => row.voidedAt, numFmt: "dd-mm-yyyy hh:mm" },
      { header: "Voided By", key: "voidedBy", width: 24, value: (row) => row.voidedByName },
      { header: "Void Reason", key: "voidReason", width: 32, value: (row) => row.voidReason },
    ],
  });

  const summary = workbook.addWorksheet("Category Summary", {
    views: [{ state: "frozen", ySplit: 5 }],
  });
  summary.mergeCells("A1:D1");
  summary.getCell("A1").value = school.name.toUpperCase();
  summary.mergeCells("A2:D2");
  summary.getCell("A2").value = "EXPENSE SUMMARY";
  summary.mergeCells("A3:D3");
  summary.getCell("A3").value = reportDateRange(from || undefined, to || undefined);
  [1, 2, 3].forEach((rowNumber) => {
    const row = summary.getRow(rowNumber);
    row.font = { bold: true, size: rowNumber === 1 ? 16 : rowNumber === 2 ? 13 : 11 };
    row.alignment = { horizontal: "center", vertical: "middle" };
  });
  const summaryHeaders = ["Category", "Posted Entries", "Posted Amount", "Voided Entries"];
  summary.addRow([]);
  const header = summary.addRow(summaryHeaders);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF091540" } };
  header.alignment = { horizontal: "center", vertical: "middle" };

  const categories = new Map<string, { posted: number; amount: number; voided: number }>();
  for (const expense of rows) {
    const item = categories.get(expense.category) ?? { posted: 0, amount: 0, voided: 0 };
    if (expense.status === "POSTED") {
      item.posted += 1;
      item.amount += expense.amountValue;
    } else {
      item.voided += 1;
    }
    categories.set(expense.category, item);
  }
  for (const [categoryName, item] of [...categories].sort((a, b) => b[1].amount - a[1].amount)) {
    summary.addRow([displayLabel(categoryName), item.posted, item.amount, item.voided]);
  }
  const totalRow = summary.addRow([
    "Total",
    rows.filter((row) => row.status === "POSTED").length,
    rows.filter((row) => row.status === "POSTED").reduce((sum, row) => sum + row.amountValue, 0),
    rows.filter((row) => row.status === "VOID").length,
  ]);
  totalRow.font = { bold: true };
  totalRow.border = { top: { style: "double", color: { argb: "FF091540" } } };
  summary.getColumn(1).width = 24;
  summary.getColumn(2).width = 18;
  summary.getColumn(3).width = 20;
  summary.getColumn(4).width = 18;
  summary.getColumn(3).numFmt = "₹#,##0.00";
  summary.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: Math.max(5, summary.rowCount - 1), column: 4 },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  await recordAuditLog({
    actor: membership,
    module: "FEES",
    action: "EXPORT",
    entityType: "EXPENSE_REPORT",
    summary: `Exported ${expenses.length} expense ledger entries to Excel.`,
    metadata: { from, to, category, status, paymentMode, rowCount: expenses.length },
  });

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safeReportFilename(school.name)}-expenses.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
