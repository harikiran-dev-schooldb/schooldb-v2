import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

type Context = { params: Promise<{ kind: string }> };
type Row = Record<string, string>;
const kinds = new Set(["inventory", "expenses", "calendar", "parent-links", "salary-structures"]);
const paymentModes = new Set(["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "ONLINE"]);
const date = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return parsed.toISOString().slice(0, 10) === value ? parsed : null;
};
const number = (value: string) => value !== "" && Number.isFinite(Number(value)) ? Number(value) : null;
const csv = (rows: Row[]) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]); const escape = (v: string) => /[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
  return [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h] ?? "")).join(","))].join("\n");
};

async function validate(kind: string, rows: Row[], schoolId: string) {
  const errors: { row: number; message: string }[] = [];
  if (!rows.length) errors.push({ row: 0, message: "At least one row is required." });
  if (rows.length > 1000) errors.push({ row: 0, message: "Maximum 1,000 rows per import." });
  const seen = new Set<string>();
  for (let index = 0; index < rows.length; index++) {
    const r = rows[index]; let message = ""; let key = "";
    if (kind === "inventory") { key = r.assetCode?.trim().toLowerCase(); if (!key || !r.name?.trim() || !r.category?.trim()) message = "assetCode, name and category are required."; else if (number(r.quantity || "0") === null || number(r.reorderLevel || "0") === null || (r.unitCost && number(r.unitCost) === null)) message = "quantity, reorderLevel and unitCost must be numbers."; else if ((r.purchaseDate && !date(r.purchaseDate)) || (r.warrantyUntil && !date(r.warrantyUntil))) message = "Purchase and warranty dates must use valid YYYY-MM-DD dates."; else if (await prisma.inventoryItem.findUnique({ where: { schoolId_assetCode: { schoolId, assetCode: r.assetCode.trim() } }, select: { id: true } })) message = "Asset code already exists."; }
    if (kind === "expenses") { if (!r.category?.trim() || !r.description?.trim() || number(r.amount) === null || Number(r.amount) <= 0 || !date(r.expenseDate) || !paymentModes.has(r.paymentMode)) message = "category, description, positive numeric amount, expenseDate (YYYY-MM-DD) and a valid paymentMode are required."; }
    if (kind === "calendar") { if (!r.title?.trim() || !date(r.startDate) || !date(r.endDate)) message = "title, startDate and endDate (YYYY-MM-DD) are required."; else if (date(r.endDate)! < date(r.startDate)!) message = "endDate cannot be before startDate."; }
    if (kind === "parent-links") { key = `${r.parentEmail?.trim().toLowerCase()}|${r.admissionNo?.trim().toLowerCase()}`; if (!r.parentEmail?.trim() || !r.admissionNo?.trim()) message = "parentEmail and admissionNo are required."; else { const [parent, student] = await Promise.all([prisma.user.findFirst({ where: { email: { equals: r.parentEmail.trim(), mode: "insensitive" }, memberships: { some: { schoolId, role: "PARENT", isActive: true } } }, select: { id: true } }), prisma.student.findFirst({ where: { schoolId, admissionNo: { equals: r.admissionNo.trim(), mode: "insensitive" } }, select: { id: true } })]); if (!parent) message = "No active parent login exists for this email."; else if (!student) message = "Admission number was not found."; else if (await prisma.parentStudentLink.findUnique({ where: { schoolId_parentUserId_studentId: { schoolId, parentUserId: parent.id, studentId: student.id } }, select: { id: true } })) message = "This parent-student link already exists."; } }
    if (kind === "salary-structures") { key = `${r.employeeId?.trim().toLowerCase()}|${r.effectiveFrom}`; if (!r.employeeId?.trim() || !date(r.effectiveFrom) || number(r.basicSalary) === null || Number(r.basicSalary) <= 0) message = "employeeId, effectiveFrom (YYYY-MM-DD) and positive numeric basicSalary are required."; else { const teacher = await prisma.teacher.findFirst({ where: { schoolId, employeeId: { equals: r.employeeId.trim(), mode: "insensitive" } }, select: { id: true } }); if (!teacher) message = "Employee ID was not found."; else if (await prisma.salaryStructure.findUnique({ where: { teacherId_effectiveFrom: { teacherId: teacher.id, effectiveFrom: date(r.effectiveFrom)! } }, select: { id: true } })) message = "A salary structure already exists for this effective date."; try { const allowances = JSON.parse(r.allowances || "{}"); const deductions = JSON.parse(r.deductions || "{}"); if (Array.isArray(allowances) || Array.isArray(deductions) || !allowances || !deductions || typeof allowances !== "object" || typeof deductions !== "object") throw new Error(); } catch { message = "allowances and deductions must be JSON objects."; } } }
    if (key && seen.has(key)) message = "Duplicate row in this file."; if (key) seen.add(key);
    if (message) errors.push({ row: index + 2, message });
  }
  return errors;
}

export async function POST(request: Request, { params }: Context) {
  return apiHandler(async () => {
    const member = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]); const { kind } = await params;
    if (!kinds.has(kind)) return ApiResponse.error("Unsupported import type.", 404);
    const body = await request.json() as { rows?: Row[]; dryRun?: boolean }; const rows = Array.isArray(body.rows) ? body.rows : [];
    const errors = await validate(kind, rows, member.schoolId);
    if (body.dryRun) return ApiResponse.success({ valid: errors.length === 0, errors, total: rows.length });
    if (errors.length) return ApiResponse.error(`Import validation failed on ${errors.length} row(s). Run a dry run for details.`, 400);
    const ids = await prisma.$transaction(async (tx) => {
      const created: string[] = [];
      for (const r of rows) {
        if (kind === "inventory") created.push((await tx.inventoryItem.create({ data: { schoolId: member.schoolId, assetCode: r.assetCode.trim(), name: r.name.trim(), category: r.category.trim(), location: r.location?.trim() || null, quantity: Number(r.quantity || 0), reorderLevel: Number(r.reorderLevel || 0), unitCost: r.unitCost ? Number(r.unitCost) : null, condition: r.condition?.trim() || "GOOD", custodian: r.custodian?.trim() || null, purchaseDate: r.purchaseDate ? date(r.purchaseDate) : null, warrantyUntil: r.warrantyUntil ? date(r.warrantyUntil) : null, createdBy: member.userId } })).id);
        if (kind === "expenses") created.push((await tx.expense.create({ data: { schoolId: member.schoolId, category: r.category.trim(), description: r.description.trim(), vendor: r.vendor?.trim() || null, amount: Number(r.amount), expenseDate: date(r.expenseDate)!, paymentMode: r.paymentMode as "CASH", referenceNo: r.referenceNo?.trim() || null, remarks: r.remarks?.trim() || null, recordedBy: member.userId } })).id);
        if (kind === "calendar") created.push((await tx.schoolCalendarEvent.create({ data: { schoolId: member.schoolId, title: r.title.trim(), description: r.description?.trim() || null, category: r.category?.trim() || "EVENT", startDate: date(r.startDate)!, endDate: date(r.endDate)!, targetType: "SCHOOL", targetLabel: "Whole school", createdBy: member.userId } })).id);
        if (kind === "parent-links") { const parent = await tx.user.findFirstOrThrow({ where: { email: { equals: r.parentEmail.trim(), mode: "insensitive" }, memberships: { some: { schoolId: member.schoolId, role: "PARENT", isActive: true } } }, select: { id: true } }); const student = await tx.student.findFirstOrThrow({ where: { schoolId: member.schoolId, admissionNo: { equals: r.admissionNo.trim(), mode: "insensitive" } }, select: { id: true } }); created.push((await tx.parentStudentLink.create({ data: { schoolId: member.schoolId, parentUserId: parent.id, studentId: student.id, relationship: r.relationship?.trim() || null } })).id); }
        if (kind === "salary-structures") { const teacher = await tx.teacher.findFirstOrThrow({ where: { schoolId: member.schoolId, employeeId: { equals: r.employeeId.trim(), mode: "insensitive" } }, select: { id: true } }); created.push((await tx.salaryStructure.create({ data: { schoolId: member.schoolId, teacherId: teacher.id, effectiveFrom: date(r.effectiveFrom)!, basicSalary: Number(r.basicSalary), allowances: JSON.parse(r.allowances || "{}"), deductions: JSON.parse(r.deductions || "{}"), createdBy: member.userId } })).id); }
      }
      return created;
    }, { timeout: 30_000 });
    await recordAuditLog({ actor: member, module: "SYSTEM", action: "IMPORT", entityType: kind, summary: `Imported ${ids.length} ${kind} records.`, metadata: { kind, createdIds: ids, created: ids.length, rollbackAvailable: true, bulkAdmin: true } });
    return ApiResponse.success({ created: ids.length }, `${ids.length} records imported.`);
  });
}

export async function GET(_request: Request, { params }: Context) {
  const member = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]); const { kind } = await params; if (!kinds.has(kind)) return new NextResponse("Unsupported export", { status: 404 });
  let rows: Row[] = [];
  if (kind === "inventory") rows = (await prisma.inventoryItem.findMany({ where: { schoolId: member.schoolId }, orderBy: { assetCode: "asc" } })).map((r) => ({ assetCode: r.assetCode, name: r.name, category: r.category, location: r.location ?? "", quantity: String(r.quantity), reorderLevel: String(r.reorderLevel), unitCost: r.unitCost?.toString() ?? "", condition: r.condition, custodian: r.custodian ?? "" }));
  if (kind === "expenses") rows = (await prisma.expense.findMany({ where: { schoolId: member.schoolId }, orderBy: { expenseDate: "desc" } })).map((r) => ({ category: r.category, description: r.description, vendor: r.vendor ?? "", amount: r.amount.toString(), expenseDate: r.expenseDate.toISOString().slice(0, 10), paymentMode: r.paymentMode, referenceNo: r.referenceNo ?? "", remarks: r.remarks ?? "" }));
  if (kind === "calendar") rows = (await prisma.schoolCalendarEvent.findMany({ where: { schoolId: member.schoolId, archived: false }, orderBy: { startDate: "asc" } })).map((r) => ({ title: r.title, description: r.description ?? "", category: r.category, startDate: r.startDate.toISOString().slice(0, 10), endDate: r.endDate.toISOString().slice(0, 10) }));
  if (kind === "parent-links") rows = (await prisma.parentStudentLink.findMany({ where: { schoolId: member.schoolId, active: true }, include: { parentUser: true, student: true } })).map((r) => ({ parentEmail: r.parentUser.email, admissionNo: r.student.admissionNo, relationship: r.relationship ?? "" }));
  if (kind === "salary-structures") rows = (await prisma.salaryStructure.findMany({ where: { schoolId: member.schoolId }, include: { teacher: true }, orderBy: { effectiveFrom: "desc" } })).map((r) => ({ employeeId: r.teacher.employeeId, effectiveFrom: r.effectiveFrom.toISOString().slice(0, 10), basicSalary: r.basicSalary.toString(), allowances: JSON.stringify(r.allowances), deductions: JSON.stringify(r.deductions) }));
  return new NextResponse(csv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${kind}-export.csv"`, "Cache-Control": "no-store" } });
}
