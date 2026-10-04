import { z } from "zod";

import { notifyStaffAttendanceFinalized } from "@/features/notifications/events";
import { queueStaffAttendanceWhatsappAlert } from "@/features/whatsapp/service";
import { prisma } from "@/lib/prisma";

const dateValue = z.string().date().transform((value) => new Date(`${value}T00:00:00.000Z`));
const optionalText = (max = 500) => z.string().trim().max(max).optional().transform((value) => value || null);
const moneyMap = z.record(z.string().trim().min(1).max(60), z.coerce.number().min(0).max(10_000_000)).default({});

function total(values: Record<string, number>) {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}

function code(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
}

async function teacherInSchool(schoolId: string, teacherId: string) {
  const teacher = await prisma.teacher.findFirst({ where: { id: teacherId, schoolId, active: true }, select: { id: true } });
  if (!teacher) throw new Error("Select an active staff member from this school.");
  return teacher;
}

async function studentInSchool(schoolId: string, studentId: string) {
  const student = await prisma.student.findFirst({ where: { id: studentId, schoolId, status: "ACTIVE" }, select: { id: true } });
  if (!student) throw new Error("Select an active student from this school.");
  return student;
}

async function ensureStaffAttendanceUnlocked(schoolId: string, date: Date) {
  const locked = await prisma.staffAttendance.findFirst({
    where: { schoolId, date, lockedAt: { not: null } },
    select: { id: true },
  });
  if (locked) throw new Error("Staff attendance for this date is locked.");
}

export async function recordStaffAttendance(schoolId: string, userId: string, value: unknown) {
  const input = z.object({
    teacherId: z.string().min(1), date: dateValue,
    status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE", "HOLIDAY"]),
    checkIn: optionalText(8), checkOut: optionalText(8), remarks: optionalText(),
    source: z.enum(["MANUAL", "BIOMETRIC", "IMPORT"]).default("MANUAL"), deviceRef: optionalText(120),
  }).parse(value);
  await teacherInSchool(schoolId, input.teacherId);
  await ensureStaffAttendanceUnlocked(schoolId, input.date);
  return prisma.staffAttendance.upsert({
    where: { schoolId_teacherId_date: { schoolId, teacherId: input.teacherId, date: input.date } },
    update: { ...input, recordedBy: userId },
    create: { schoolId, ...input, recordedBy: userId },
  });
}

export async function fullPresentStaffAttendance(schoolId: string, userId: string, value: unknown) {
  const input = z.object({ date: dateValue }).parse(value);
  await ensureStaffAttendanceUnlocked(schoolId, input.date);

  const teachers = await prisma.teacher.findMany({
    where: { schoolId, active: true },
    orderBy: { fullName: "asc" },
    select: { id: true },
  });
  if (!teachers.length) throw new Error("No active staff members found.");

  await prisma.$transaction(
    teachers.map((teacher) =>
      prisma.staffAttendance.upsert({
        where: {
          schoolId_teacherId_date: { schoolId, teacherId: teacher.id, date: input.date },
        },
        update: {
          status: "PRESENT",
          source: "MANUAL",
          recordedBy: userId,
          lockedAt: null,
          lockedBy: null,
        },
        create: {
          schoolId,
          teacherId: teacher.id,
          date: input.date,
          status: "PRESENT",
          source: "MANUAL",
          recordedBy: userId,
        },
      }),
    ),
  );

  return { total: teachers.length, present: teachers.length, absent: 0, locked: false };
}

export async function finalizeStaffAttendance(schoolId: string, userId: string, value: unknown) {
  const input = z.object({
    date: dateValue,
    absentTeacherIds: z.array(z.string().min(1)).max(1000).default([]),
  }).parse(value);
  await ensureStaffAttendanceUnlocked(schoolId, input.date);

  const teachers = await prisma.teacher.findMany({
    where: { schoolId, active: true },
    orderBy: { fullName: "asc" },
    select: { id: true, employeeId: true, fullName: true, phone: true },
  });
  if (!teachers.length) throw new Error("No active staff members found.");

  const teacherIds = new Set(teachers.map((teacher) => teacher.id));
  const absentIds = new Set(input.absentTeacherIds);
  const invalidIds = [...absentIds].filter((id) => !teacherIds.has(id));
  if (invalidIds.length) throw new Error("One or more selected staff members are invalid.");

  const lockedAt = new Date();
  await prisma.$transaction(
    teachers.map((teacher) =>
      prisma.staffAttendance.upsert({
        where: {
          schoolId_teacherId_date: { schoolId, teacherId: teacher.id, date: input.date },
        },
        update: {
          status: absentIds.has(teacher.id) ? "ABSENT" : "PRESENT",
          source: "MANUAL",
          recordedBy: userId,
          lockedAt,
          lockedBy: userId,
        },
        create: {
          schoolId,
          teacherId: teacher.id,
          date: input.date,
          status: absentIds.has(teacher.id) ? "ABSENT" : "PRESENT",
          source: "MANUAL",
          recordedBy: userId,
          lockedAt,
          lockedBy: userId,
        },
      }),
    ),
  );

  const absentTeachers = teachers.filter((teacher) => absentIds.has(teacher.id));
  const dateKey = input.date.toISOString().slice(0, 10);

  const appNotification = await notifyStaffAttendanceFinalized({
    schoolId,
    date: input.date,
    total: teachers.length,
    absentTeachers: absentTeachers.map((teacher) => ({
      id: teacher.id,
      employeeId: teacher.employeeId,
      fullName: teacher.fullName,
    })),
  }).catch((error) => {
    console.error("[staff-attendance] Unable to create app notifications", error);
    return null;
  });

  const whatsappResults = await Promise.all(
    absentTeachers.map((teacher) =>
      queueStaffAttendanceWhatsappAlert({
        schoolId,
        teacherId: teacher.id,
        employeeId: teacher.employeeId,
        staffName: teacher.fullName,
        phone: teacher.phone,
        date: dateKey,
      }),
    ),
  );

  return {
    total: teachers.length,
    present: teachers.length - absentTeachers.length,
    absent: absentTeachers.length,
    locked: true,
    appNotifications: appNotification?.absent ?? 0,
    whatsappSent: whatsappResults.filter(Boolean).length,
  };
}

export async function importStaffAttendance(schoolId: string, userId: string, value: unknown) {
  const rows = z.array(z.object({
    employeeId: z.string().trim().min(1), date: z.string().date(),
    status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE", "HOLIDAY"]),
    checkIn: optionalText(8), checkOut: optionalText(8), deviceRef: optionalText(120),
  })).min(1).max(3000).parse(value);

  const importDates = [...new Set(rows.map((row) => row.date))].map(
    (date) => new Date(`${date}T00:00:00.000Z`),
  );
  const locked = await prisma.staffAttendance.findFirst({
    where: { schoolId, date: { in: importDates }, lockedAt: { not: null } },
    select: { date: true },
  });
  if (locked) {
    throw new Error(
      `Staff attendance for ${locked.date.toISOString().slice(0, 10)} is locked.`,
    );
  }

  const teachers = await prisma.teacher.findMany({
    where: { schoolId, employeeId: { in: rows.map((row) => row.employeeId) }, active: true },
    select: { id: true, employeeId: true },
  });
  const byEmployee = new Map(teachers.map((teacher) => [teacher.employeeId, teacher.id]));
  const missing = [...new Set(rows.filter((row) => !byEmployee.has(row.employeeId)).map((row) => row.employeeId))];
  if (missing.length) throw new Error(`Unknown employee IDs: ${missing.slice(0, 10).join(", ")}`);
  await prisma.$transaction(rows.map((row) => prisma.staffAttendance.upsert({
    where: { schoolId_teacherId_date: { schoolId, teacherId: byEmployee.get(row.employeeId)!, date: new Date(`${row.date}T00:00:00.000Z`) } },
    update: { status: row.status, checkIn: row.checkIn, checkOut: row.checkOut, deviceRef: row.deviceRef, source: "IMPORT", recordedBy: userId },
    create: { schoolId, teacherId: byEmployee.get(row.employeeId)!, date: new Date(`${row.date}T00:00:00.000Z`), status: row.status, checkIn: row.checkIn, checkOut: row.checkOut, deviceRef: row.deviceRef, source: "IMPORT", recordedBy: userId },
  })));
  return { imported: rows.length };
}

export async function createStaffLeave(schoolId: string, userId: string, value: unknown) {
  const input = z.object({ teacherId: z.string().min(1), leaveType: z.string().trim().min(2).max(40), startDate: dateValue, endDate: dateValue, days: z.coerce.number().positive().max(365), reason: z.string().trim().min(3).max(1000) }).parse(value);
  await teacherInSchool(schoolId, input.teacherId);
  if (input.endDate < input.startDate) throw new Error("End date must be on or after the start date.");
  return prisma.staffLeaveRequest.create({ data: { schoolId, ...input, requestedBy: userId } });
}

export async function decideStaffLeave(schoolId: string, userId: string, value: unknown) {
  const input = z.object({ id: z.string().min(1), status: z.enum(["APPROVED", "REJECTED", "CANCELLED"]), decisionNote: optionalText() }).parse(value);
  const item = await prisma.staffLeaveRequest.findFirst({ where: { id: input.id, schoolId }, select: { id: true } });
  if (!item) throw new Error("Leave request not found.");
  return prisma.staffLeaveRequest.update({ where: { id: item.id }, data: { status: input.status, decisionNote: input.decisionNote, decidedBy: userId, decidedAt: new Date() } });
}

export async function saveSalaryStructure(schoolId: string, userId: string, value: unknown) {
  const input = z.object({ teacherId: z.string().min(1), effectiveFrom: dateValue, basicSalary: z.coerce.number().positive().max(10_000_000), allowances: moneyMap, deductions: moneyMap }).parse(value);
  await teacherInSchool(schoolId, input.teacherId);
  return prisma.$transaction(async (tx) => {
    await tx.salaryStructure.updateMany({ where: { schoolId, teacherId: input.teacherId, active: true }, data: { active: false } });
    return tx.salaryStructure.upsert({
      where: { teacherId_effectiveFrom: { teacherId: input.teacherId, effectiveFrom: input.effectiveFrom } },
      update: { basicSalary: input.basicSalary, allowances: input.allowances, deductions: input.deductions, active: true, createdBy: userId },
      create: { schoolId, ...input, active: true, createdBy: userId },
    });
  });
}

export async function runPayroll(schoolId: string, userId: string, value: unknown) {
  const input = z.object({ year: z.coerce.number().int().min(2020).max(2100), month: z.coerce.number().int().min(1).max(12), notes: optionalText(1000) }).parse(value);
  const structures = await prisma.salaryStructure.findMany({ where: { schoolId, active: true }, include: { teacher: { select: { id: true, active: true } } } });
  if (!structures.length) throw new Error("Add at least one active salary structure before running payroll.");
  return prisma.$transaction(async (tx) => {
    const run = await tx.payrollRun.upsert({
      where: { schoolId_year_month: { schoolId, year: input.year, month: input.month } },
      update: { notes: input.notes, processedBy: userId },
      create: { schoolId, ...input, processedBy: userId },
    });
    for (const structure of structures.filter((item) => item.teacher.active)) {
      const allowances = structure.allowances as Record<string, number>;
      const deductions = structure.deductions as Record<string, number>;
      const basic = Number(structure.basicSalary);
      const allowanceTotal = total(allowances);
      const deductionTotal = total(deductions);
      await tx.payrollEntry.upsert({
        where: { payrollRunId_teacherId: { payrollRunId: run.id, teacherId: structure.teacherId } },
        update: { basicSalary: basic, allowanceTotal, deductionTotal, grossSalary: basic + allowanceTotal, netSalary: Math.max(0, basic + allowanceTotal - deductionTotal), breakdown: { allowances, deductions } },
        create: { schoolId, payrollRunId: run.id, teacherId: structure.teacherId, basicSalary: basic, allowanceTotal, deductionTotal, grossSalary: basic + allowanceTotal, netSalary: Math.max(0, basic + allowanceTotal - deductionTotal), breakdown: { allowances, deductions } },
      });
    }
    return tx.payrollRun.update({ where: { id: run.id }, data: { status: "PROCESSED", processedAt: new Date() }, include: { entries: true } });
  });
}

export async function markPayrollPaid(schoolId: string, value: unknown) {
  const input = z.object({ entryId: z.string().min(1), paymentMode: z.string().trim().min(2).max(40), paymentRef: optionalText(120) }).parse(value);
  const entry = await prisma.payrollEntry.findFirst({ where: { id: input.entryId, schoolId }, select: { id: true, payrollRunId: true } });
  if (!entry) throw new Error("Payroll entry not found.");
  return prisma.$transaction(async (tx) => {
    const updated = await tx.payrollEntry.update({ where: { id: entry.id }, data: { paymentStatus: "PAID", paymentMode: input.paymentMode, paymentRef: input.paymentRef, paidAt: new Date() } });
    const pending = await tx.payrollEntry.count({ where: { payrollRunId: entry.payrollRunId, paymentStatus: { not: "PAID" } } });
    if (!pending) await tx.payrollRun.update({ where: { id: entry.payrollRunId }, data: { status: "PAID", paidAt: new Date() } });
    return updated;
  });
}

export async function checkInVisitor(schoolId: string, userId: string, value: unknown) {
  const input = z.object({ visitorName: z.string().trim().min(2).max(160), phone: z.string().trim().min(7).max(24), purpose: z.string().trim().min(2).max(300), personToMeet: optionalText(160), idProofType: optionalText(60), idProofLastFour: optionalText(4), vehicleNumber: optionalText(30), notes: optionalText() }).parse(value);
  return prisma.visitorLog.create({ data: { schoolId, ...input, gatePassCode: code("VIS"), recordedBy: userId } });
}

export async function checkOutVisitor(schoolId: string, value: unknown) {
  const { id } = z.object({ id: z.string().min(1) }).parse(value);
  const item = await prisma.visitorLog.findFirst({ where: { id, schoolId, status: "CHECKED_IN" }, select: { id: true } });
  if (!item) throw new Error("Active visitor pass not found.");
  return prisma.visitorLog.update({ where: { id }, data: { status: "CHECKED_OUT", checkOutAt: new Date() } });
}

export async function saveHealthRecord(schoolId: string, userId: string, value: unknown) {
  const input = z.object({ studentId: z.string().min(1), bloodGroup: optionalText(12), allergies: optionalText(1000), medicalConditions: optionalText(1000), medications: optionalText(1000), accessibilityNeeds: optionalText(1000), emergencyContact: optionalText(160), emergencyPhone: optionalText(24), physicianName: optionalText(160), physicianPhone: optionalText(24), insuranceDetails: optionalText(), consentNotes: optionalText(1000) }).parse(value);
  await studentInSchool(schoolId, input.studentId);
  return prisma.studentHealthRecord.upsert({ where: { studentId: input.studentId }, update: { ...input, schoolId, updatedBy: userId }, create: { schoolId, ...input, updatedBy: userId } });
}

export async function logHealthVisit(schoolId: string, userId: string, value: unknown) {
  const input = z.object({ studentId: z.string().min(1), complaint: z.string().trim().min(2).max(500), actionTaken: z.string().trim().min(2).max(1000), disposition: z.enum(["RETURNED_TO_CLASS", "SENT_HOME", "REFERRED_TO_DOCTOR", "EMERGENCY"]), guardianNotified: z.coerce.boolean().default(false), followUpAt: z.string().optional().transform((value) => value ? new Date(value) : null) }).parse(value);
  if (input.followUpAt && Number.isNaN(input.followUpAt.getTime())) throw new Error("Enter a valid follow-up date and time.");
  await studentInSchool(schoolId, input.studentId);
  return prisma.studentHealthVisit.create({ data: { schoolId, ...input, recordedBy: userId } });
}

export async function createInventoryItem(schoolId: string, userId: string, value: unknown) {
  const input = z.object({ assetCode: z.string().trim().min(1).max(40).transform((v) => v.toUpperCase()), name: z.string().trim().min(2).max(160), category: z.string().trim().min(2).max(80), location: optionalText(120), quantity: z.coerce.number().int().min(0).max(1_000_000), reorderLevel: z.coerce.number().int().min(0).max(1_000_000), unitCost: z.union([z.coerce.number().min(0), z.literal("")]).optional().transform((v) => v === "" || v === undefined ? null : v), condition: z.enum(["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"]), custodian: optionalText(160), purchaseDate: z.union([dateValue, z.literal("")]).optional().transform((v) => v || null), warrantyUntil: z.union([dateValue, z.literal("")]).optional().transform((v) => v || null) }).parse(value);
  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.create({ data: { schoolId, ...input, createdBy: userId } });
    if (input.quantity) await tx.inventoryMovement.create({ data: { schoolId, itemId: item.id, type: "OPENING", quantity: input.quantity, recordedBy: userId } });
    return item;
  });
}

export async function adjustInventory(schoolId: string, userId: string, value: unknown) {
  const input = z.object({ itemId: z.string().min(1), type: z.enum(["IN", "OUT", "ADJUSTMENT"]), quantity: z.coerce.number().int().positive().max(1_000_000), reference: optionalText(120), notes: optionalText() }).parse(value);
  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findFirst({ where: { id: input.itemId, schoolId, active: true }, select: { id: true, quantity: true } });
    if (!item) throw new Error("Inventory item not found.");
    const delta = input.type === "OUT" ? -input.quantity : input.quantity;
    if (item.quantity + delta < 0) throw new Error("Stock cannot become negative.");
    await tx.inventoryItem.update({ where: { id: item.id }, data: { quantity: { increment: delta } } });
    return tx.inventoryMovement.create({ data: { schoolId, itemId: item.id, type: input.type, quantity: input.quantity, reference: input.reference, notes: input.notes, recordedBy: userId } });
  });
}

export async function authorizePickup(schoolId: string, userId: string, value: unknown) {
  const input = z.object({ studentId: z.string().min(1), authorizedName: z.string().trim().min(2).max(160), relationship: z.string().trim().min(2).max(80), phone: z.string().trim().min(7).max(24), validFrom: dateValue, validUntil: z.union([dateValue, z.literal("")]).optional().transform((v) => v || null), recurring: z.coerce.boolean().default(false), notes: optionalText() }).parse(value);
  await studentInSchool(schoolId, input.studentId);
  if (input.validUntil && input.validUntil < input.validFrom) throw new Error("Valid-until date cannot be before valid-from date.");
  return prisma.pickupAuthorization.create({ data: { schoolId, ...input, pickupCode: code("PICK"), approvedBy: userId } });
}

export async function updatePickup(schoolId: string, value: unknown) {
  const input = z.object({ id: z.string().min(1), action: z.enum(["USE", "REVOKE"]) }).parse(value);
  const item = await prisma.pickupAuthorization.findFirst({ where: { id: input.id, schoolId }, select: { id: true, status: true } });
  if (!item) throw new Error("Pickup authorization not found.");
  return prisma.pickupAuthorization.update({ where: { id: item.id }, data: input.action === "USE" ? { lastUsedAt: new Date() } : { status: "REVOKED" } });
}

export async function createMaintenanceTicket(schoolId: string, userId: string, value: unknown) {
  const input = z.object({ title: z.string().trim().min(3).max(180), description: z.string().trim().min(3).max(1500), category: z.string().trim().min(2).max(80), location: optionalText(120), priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]), assignedTo: optionalText(160), estimatedCost: z.union([z.coerce.number().min(0), z.literal("")]).optional().transform((v) => v === "" || v === undefined ? null : v), dueDate: z.union([dateValue, z.literal("")]).optional().transform((v) => v || null) }).parse(value);
  return prisma.maintenanceTicket.create({ data: { schoolId, ...input, ticketNo: code("MNT"), reportedBy: userId } });
}

export async function updateMaintenanceTicket(schoolId: string, value: unknown) {
  const input = z.object({ id: z.string().min(1), status: z.enum(["OPEN", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED"]), assignedTo: optionalText(160), actualCost: z.union([z.coerce.number().min(0), z.literal("")]).optional().transform((v) => v === "" || v === undefined ? null : v), resolution: optionalText(1000) }).parse(value);
  const item = await prisma.maintenanceTicket.findFirst({ where: { id: input.id, schoolId }, select: { id: true } });
  if (!item) throw new Error("Maintenance ticket not found.");
  return prisma.maintenanceTicket.update({ where: { id: item.id }, data: { status: input.status, assignedTo: input.assignedTo, actualCost: input.actualCost, resolution: input.resolution, resolvedAt: ["RESOLVED", "CLOSED"].includes(input.status) ? new Date() : null } });
}
