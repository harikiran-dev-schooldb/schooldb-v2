import { prisma } from "@/lib/prisma";

export type OperationsModule = "staff" | "visitors" | "health" | "inventory" | "pickup" | "maintenance" | "analytics";

function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function getOperationsData(schoolId: string, module: OperationsModule) {
  const teachers = module === "staff" ? await prisma.teacher.findMany({
    where: { schoolId, active: true }, orderBy: { fullName: "asc" },
    select: { id: true, employeeId: true, fullName: true, designation: true },
  }) : [];
  const students = ["health", "pickup"].includes(module) ? await prisma.student.findMany({
    where: { schoolId, status: "ACTIVE" }, orderBy: { fullName: "asc" }, take: 1000,
    select: { id: true, admissionNo: true, fullName: true },
  }) : [];

  if (module === "staff") {
    const [attendance, leaves, salaries, payrollRuns, payrollEntries] = await Promise.all([
      prisma.staffAttendance.findMany({ where: { schoolId }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 150, include: { teacher: { select: { fullName: true, employeeId: true } } } }),
      prisma.staffLeaveRequest.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" }, take: 100, include: { teacher: { select: { fullName: true, employeeId: true } } } }),
      prisma.salaryStructure.findMany({ where: { schoolId, active: true }, orderBy: { effectiveFrom: "desc" }, include: { teacher: { select: { fullName: true, employeeId: true } } } }),
      prisma.payrollRun.findMany({ where: { schoolId }, orderBy: [{ year: "desc" }, { month: "desc" }], take: 24, include: { _count: { select: { entries: true } } } }),
      prisma.payrollEntry.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" }, take: 200, include: { teacher: { select: { fullName: true, employeeId: true } }, payrollRun: { select: { year: true, month: true } } } }),
    ]);
    return plain({ teachers, students, attendance, leaves, salaries, payrollRuns, payrollEntries });
  }
  if (module === "visitors") return plain({ teachers, students, visitors: await prisma.visitorLog.findMany({ where: { schoolId }, orderBy: { checkInAt: "desc" }, take: 200 }) });
  if (module === "health") {
    const [records, visits] = await Promise.all([
      prisma.studentHealthRecord.findMany({ where: { schoolId }, orderBy: { updatedAt: "desc" }, take: 200, include: { student: { select: { fullName: true, admissionNo: true } } } }),
      prisma.studentHealthVisit.findMany({ where: { schoolId }, orderBy: { occurredAt: "desc" }, take: 200, include: { student: { select: { fullName: true, admissionNo: true } } } }),
    ]);
    return plain({ teachers, students, records, visits });
  }
  if (module === "inventory") return plain({ teachers, students, items: await prisma.inventoryItem.findMany({ where: { schoolId, active: true }, orderBy: [{ category: "asc" }, { name: "asc" }], include: { movements: { orderBy: { createdAt: "desc" }, take: 5 } } }) });
  if (module === "pickup") return plain({ teachers, students, authorizations: await prisma.pickupAuthorization.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" }, take: 200, include: { student: { select: { fullName: true, admissionNo: true } } } }) });
  if (module === "maintenance") return plain({ teachers, students, tickets: await prisma.maintenanceTicket.findMany({ where: { schoolId }, orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 200 }) });

  const today = new Date();
  const dayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const [activeStudents, activeStaff, presentStaff, activeVisitors, openMaintenance, lowStock, monthlyFees, monthlyExpenses, monthlyPayroll, pendingLeave, healthVisits] = await Promise.all([
    prisma.student.count({ where: { schoolId, status: "ACTIVE" } }),
    prisma.teacher.count({ where: { schoolId, active: true } }),
    prisma.staffAttendance.count({ where: { schoolId, date: dayStart, status: "PRESENT" } }),
    prisma.visitorLog.count({ where: { schoolId, status: "CHECKED_IN" } }),
    prisma.maintenanceTicket.count({ where: { schoolId, status: { in: ["OPEN", "IN_PROGRESS", "ON_HOLD"] } } }),
    prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "InventoryItem" WHERE "schoolId" = ${schoolId} AND active = true AND quantity <= "reorderLevel"`,
    prisma.feePayment.aggregate({ where: { schoolId, status: "SUCCESS", paymentDate: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { schoolId, status: "POSTED", expenseDate: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.payrollEntry.aggregate({ where: { schoolId, payrollRun: { year: today.getUTCFullYear(), month: today.getUTCMonth() + 1 } }, _sum: { netSalary: true } }),
    prisma.staffLeaveRequest.count({ where: { schoolId, status: "PENDING" } }),
    prisma.studentHealthVisit.count({ where: { schoolId, occurredAt: { gte: monthStart } } }),
  ]);
  return plain({ teachers, students, metrics: { activeStudents, activeStaff, presentStaff, activeVisitors, openMaintenance, lowStock: Number(lowStock[0]?.count ?? 0), monthlyFees: Number(monthlyFees._sum.amount ?? 0), monthlyExpenses: Number(monthlyExpenses._sum.amount ?? 0), monthlyPayroll: Number(monthlyPayroll._sum.netSalary ?? 0), pendingLeave, healthVisits } });
}
