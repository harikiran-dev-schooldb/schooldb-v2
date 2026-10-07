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
import { hasModuleAccess, type StaffPermissionModule } from "@/lib/staff-permissions";
import { runOfflineMutation } from "@/lib/offline-mutation";

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
    const actionModule: StaffPermissionModule = input.action === "CHECK_IN_VISITOR" || input.action === "CHECK_OUT_VISITOR"
      ? "FRONT_OFFICE"
      : input.action === "SAVE_HEALTH_RECORD" || input.action === "LOG_HEALTH_VISIT"
        ? "FRONT_OFFICE"
        : input.action === "CREATE_INVENTORY_ITEM" || input.action === "ADJUST_INVENTORY"
          ? "INVENTORY"
          : input.action === "AUTHORIZE_PICKUP" || input.action === "UPDATE_PICKUP"
            ? "FRONT_OFFICE"
            : input.action === "CREATE_MAINTENANCE" || input.action === "UPDATE_MAINTENANCE"
              ? "FRONT_OFFICE"
              : "STAFF";
    if (!hasModuleAccess(membership, actionModule, "MANAGE")) {
      throw new Error("You do not have permission to manage this school operation.");
    }

    const mutation = await runOfflineMutation(
      request,
      membership,
      `operations:${input.action}`,
      async (mutationId) => {
        const args = [membership.schoolId, membership.userId, input.data] as const;
        return input.action === "RECORD_ATTENDANCE" ? recordStaffAttendance(...args)
          : input.action === "SAVE_STAFF_ATTENDANCE" ? saveStaffAttendance(...args)
          : input.action === "IMPORT_ATTENDANCE" ? importStaffAttendance(...args)
          : input.action === "CREATE_STAFF_LEAVE" ? createStaffLeave(...args)
          : input.action === "DECIDE_STAFF_LEAVE" ? decideStaffLeave(...args)
          : input.action === "SAVE_SALARY" ? saveSalaryStructure(...args)
          : input.action === "RUN_PAYROLL" ? runPayroll(...args)
          : input.action === "MARK_PAYROLL_PAID" ? markPayrollPaid(membership.schoolId, input.data)
          : input.action === "CHECK_IN_VISITOR" ? checkInVisitor(...args, mutationId)
          : input.action === "CHECK_OUT_VISITOR" ? checkOutVisitor(membership.schoolId, input.data)
          : input.action === "SAVE_HEALTH_RECORD" ? saveHealthRecord(...args)
          : input.action === "LOG_HEALTH_VISIT" ? logHealthVisit(...args)
          : input.action === "CREATE_INVENTORY_ITEM" ? createInventoryItem(...args)
          : input.action === "ADJUST_INVENTORY" ? adjustInventory(...args)
          : input.action === "AUTHORIZE_PICKUP" ? authorizePickup(...args, mutationId)
          : input.action === "UPDATE_PICKUP" ? updatePickup(membership.schoolId, input.data)
          : input.action === "CREATE_MAINTENANCE" ? createMaintenanceTicket(...args)
          : updateMaintenanceTicket(membership.schoolId, input.data);
      },
    );

    return ApiResponse.success(
      mutation.data,
      mutation.replayed ? "Offline change was already synchronized." : "Saved successfully.",
      mutation.replayed ? 200 : 201,
    );
  });
}

export async function GET(request: Request) {
  return apiHandler(async () => {
    const url = new URL(request.url);
    const membership = await requireRole(
      url.searchParams.get("kind") === "payroll-report"
        ? ["SUPER_ADMIN", "SCHOOL_ADMIN"]
        : ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"],
    );
    const operationModule: StaffPermissionModule = url.searchParams.get("kind") === "payroll-report"
      ? "REPORTS"
      : "STAFF";
    if (!hasModuleAccess(membership, operationModule, "VIEW")) {
      throw new Error("You do not have permission to access this report.");
    }
    if (url.searchParams.get("kind") === "staff-attendance-report") {
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      if (!from || !to || !z.string().date().safeParse(from).success || !z.string().date().safeParse(to).success) {
        return ApiResponse.error("Valid from and to dates are required.", 400);
      }
      const startDate = new Date(`${from}T00:00:00.000Z`);
      const endDate = new Date(`${to}T00:00:00.000Z`);
      const rangeDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
      if (rangeDays < 1) return ApiResponse.error("The end date must be on or after the start date.", 400);
      if (rangeDays > 93) return ApiResponse.error("Staff attendance reports are limited to 93 days at a time.", 400);
      const attendance = await prisma.staffAttendance.findMany({
        where: {
          schoolId: membership.schoolId,
          date: { gte: startDate, lte: endDate },
          status: { not: "HOLIDAY" },
        },
        orderBy: [{ date: "desc" }, { teacher: { fullName: "asc" } }],
        select: {
          id: true,
          teacherId: true,
          date: true,
          status: true,
          source: true,
          remarks: true,
          teacher: { select: { fullName: true, employeeId: true, designation: true } },
        },
      });
      return ApiResponse.success({ from, to, attendance }, "Staff attendance report loaded.");
    }
    if (url.searchParams.get("kind") === "staff-attendance") {
      const date = url.searchParams.get("date");
      if (!date || !z.string().date().safeParse(date).success) return ApiResponse.error("A valid attendance date is required.", 400);
      const attendanceDate = new Date(`${date}T00:00:00.000Z`);
      const attendance = await prisma.staffAttendance.findMany({
        where: { schoolId: membership.schoolId, date: attendanceDate, status: { not: "HOLIDAY" } },
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
