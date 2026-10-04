import { z } from "zod";

import {
  adjustInventory,
  authorizePickup,
  checkInVisitor,
  checkOutVisitor,
  createInventoryItem,
  createMaintenanceTicket,
  createStaffLeave,
  decideStaffLeave,
  importStaffAttendance,
  logHealthVisit,
  markPayrollPaid,
  recordStaffAttendance,
  runPayroll,
  saveStaffAttendance,
  saveHealthRecord,
  saveSalaryStructure,
  updateMaintenanceTicket,
  updatePickup,
} from "@/features/operations/service";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  action: z.enum([
    "RECORD_ATTENDANCE", "SAVE_STAFF_ATTENDANCE", "IMPORT_ATTENDANCE", "CREATE_STAFF_LEAVE", "DECIDE_STAFF_LEAVE",
    "SAVE_SALARY", "RUN_PAYROLL", "MARK_PAYROLL_PAID", "CHECK_IN_VISITOR", "CHECK_OUT_VISITOR",
    "SAVE_HEALTH_RECORD", "LOG_HEALTH_VISIT", "CREATE_INVENTORY_ITEM", "ADJUST_INVENTORY",
    "AUTHORIZE_PICKUP", "UPDATE_PICKUP", "CREATE_MAINTENANCE", "UPDATE_MAINTENANCE",
  ]),
  data: z.unknown(),
});

export async function POST(request: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT", "RECEPTIONIST"]);
    const input = schema.parse(await request.json());
    const financeAndAdmin = new Set([
      "RECORD_ATTENDANCE", "SAVE_STAFF_ATTENDANCE", "IMPORT_ATTENDANCE", "CREATE_STAFF_LEAVE", "DECIDE_STAFF_LEAVE",
      "SAVE_SALARY", "RUN_PAYROLL", "MARK_PAYROLL_PAID", "CREATE_INVENTORY_ITEM", "ADJUST_INVENTORY",
    ]);
    if (financeAndAdmin.has(input.action) && !["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"].includes(membership.role)) {
      throw new Error("You do not have permission to manage staff, payroll or inventory.");
    }

    const args = [membership.schoolId, membership.userId, input.data] as const;
    const result = input.action === "RECORD_ATTENDANCE" ? await recordStaffAttendance(...args)
      : input.action === "SAVE_STAFF_ATTENDANCE" ? await saveStaffAttendance(...args)
      : input.action === "IMPORT_ATTENDANCE" ? await importStaffAttendance(...args)
      : input.action === "CREATE_STAFF_LEAVE" ? await createStaffLeave(...args)
      : input.action === "DECIDE_STAFF_LEAVE" ? await decideStaffLeave(...args)
      : input.action === "SAVE_SALARY" ? await saveSalaryStructure(...args)
      : input.action === "RUN_PAYROLL" ? await runPayroll(...args)
      : input.action === "MARK_PAYROLL_PAID" ? await markPayrollPaid(membership.schoolId, input.data)
      : input.action === "CHECK_IN_VISITOR" ? await checkInVisitor(...args)
      : input.action === "CHECK_OUT_VISITOR" ? await checkOutVisitor(membership.schoolId, input.data)
      : input.action === "SAVE_HEALTH_RECORD" ? await saveHealthRecord(...args)
      : input.action === "LOG_HEALTH_VISIT" ? await logHealthVisit(...args)
      : input.action === "CREATE_INVENTORY_ITEM" ? await createInventoryItem(...args)
      : input.action === "ADJUST_INVENTORY" ? await adjustInventory(...args)
      : input.action === "AUTHORIZE_PICKUP" ? await authorizePickup(...args)
      : input.action === "UPDATE_PICKUP" ? await updatePickup(membership.schoolId, input.data)
      : input.action === "CREATE_MAINTENANCE" ? await createMaintenanceTicket(...args)
      : await updateMaintenanceTicket(membership.schoolId, input.data);

    return ApiResponse.success(result, "Saved successfully.", 201);
  });
}

export async function GET(request: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"]);
    const url = new URL(request.url);
    if (url.searchParams.get("kind") === "staff-attendance") {
      const date = url.searchParams.get("date");
      if (!date || !z.string().date().safeParse(date).success) return ApiResponse.error("A valid attendance date is required.", 400);
      const attendanceDate = new Date(`${date}T00:00:00.000Z`);
      const attendance = await prisma.staffAttendance.findMany({
        where: { schoolId: membership.schoolId, date: attendanceDate },
        orderBy: { teacher: { fullName: "asc" } },
        include: { teacher: { select: { fullName: true, employeeId: true } } },
      });
      return ApiResponse.success({ date, attendance }, "Staff attendance loaded.");
    }
    if (url.searchParams.get("kind") !== "payroll-report") return ApiResponse.error("Unknown report.", 400);
    const year = Number(url.searchParams.get("year") || new Date().getFullYear());
    const month = Number(url.searchParams.get("month") || new Date().getMonth() + 1);
    const entries = await prisma.payrollEntry.findMany({
      where: { schoolId: membership.schoolId, payrollRun: { year, month } },
      orderBy: { teacher: { fullName: "asc" } },
      include: { teacher: { select: { employeeId: true, fullName: true } } },
    });
    const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [["Employee ID", "Staff Name", "Basic", "Allowances", "Deductions", "Gross", "Net", "Payment Status", "Payment Reference"], ...entries.map((entry) => [entry.teacher.employeeId, entry.teacher.fullName, entry.basicSalary, entry.allowanceTotal, entry.deductionTotal, entry.grossSalary, entry.netSalary, entry.paymentStatus, entry.paymentRef ?? ""])];
    return new Response(rows.map((row) => row.map(quote).join(",")).join("\n"), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="payroll-${year}-${String(month).padStart(2, "0")}.csv"` },
    });
  });
}
