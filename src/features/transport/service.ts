import { z } from "zod";

import { prisma } from "@/lib/prisma";

const optionalText = z.string().trim().max(120).optional().transform((value) => value || null);
const phone = z.string().trim().regex(/^\d{10}$/, "Enter a valid 10-digit mobile number.");
const time = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time.").optional().transform((value) => value || null);

export const vehicleSchema = z.object({
  registrationNo: z.string().trim().min(4).max(30).transform((value) => value.toUpperCase()),
  name: optionalText,
  type: z.enum(["BUS", "VAN", "MINI_BUS", "OTHER"]),
  capacity: z.coerce.number().int().min(1).max(100),
  driverName: z.string().trim().min(2).max(120),
  driverPhone: phone,
  attendantName: optionalText,
  attendantPhone: z.union([phone, z.literal("")]).optional().transform((value) => value || null),
});

export const routeSchema = z.object({
  code: z.string().trim().min(1).max(30).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(160),
  vehicleId: z.string().trim().optional().transform((value) => !value || value === "none" ? null : value),
  pickupStart: time,
  dropStart: time,
});

export const stopSchema = z.object({
  routeId: z.string().min(1),
  name: z.string().trim().min(2).max(160),
  sequence: z.coerce.number().int().min(1).max(999),
  pickupTime: time,
  dropTime: time,
  monthlyFee: z.union([z.coerce.number().min(0).max(1_000_000), z.literal("")]).optional().transform((value) => value === "" || value === undefined ? null : value),
});

export const assignmentSchema = z.object({
  studentId: z.string().min(1),
  academicYearId: z.string().min(1),
  routeId: z.string().min(1),
  stopId: z.string().min(1),
  pickupEnabled: z.boolean(),
  dropEnabled: z.boolean(),
  startDate: z.string().date(),
  notes: z.string().trim().max(500).optional().transform((value) => value || null),
}).refine((value) => value.pickupEnabled || value.dropEnabled, {
  message: "Enable pickup, drop, or both.",
});

export async function listTransportDashboard(schoolId: string) {
  const [vehicles, routes, assignments] = await Promise.all([
    prisma.transportVehicle.findMany({
      where: { schoolId },
      orderBy: [{ active: "desc" }, { registrationNo: "asc" }],
      select: {
        id: true,
        registrationNo: true,
        name: true,
        type: true,
        capacity: true,
        driverName: true,
        driverPhone: true,
        attendantName: true,
        attendantPhone: true,
        active: true,
        _count: { select: { routes: true } },
      },
    }),
    prisma.transportRoute.findMany({
      where: { schoolId },
      orderBy: [{ active: "desc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        pickupStart: true,
        dropStart: true,
        active: true,
        vehicle: { select: { id: true, registrationNo: true, name: true } },
        stops: {
          orderBy: { sequence: "asc" },
          select: { id: true, name: true, sequence: true, pickupTime: true, dropTime: true, monthlyFee: true, active: true },
        },
        _count: { select: { assignments: { where: { active: true } } } },
      },
    }),
    prisma.studentTransportAssignment.findMany({
      where: { schoolId, active: true },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        pickupEnabled: true,
        dropEnabled: true,
        startDate: true,
        notes: true,
        studentEnrollment: {
          select: {
            student: { select: { id: true, admissionNo: true, fullName: true } },
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        route: { select: { id: true, code: true, name: true, vehicle: { select: { registrationNo: true } } } },
        stop: { select: { id: true, name: true, pickupTime: true, dropTime: true } },
      },
    }),
  ]);

  return { vehicles, routes, assignments };
}

export async function createTransportVehicle(schoolId: string, value: unknown) {
  const input = vehicleSchema.parse(value);
  return prisma.transportVehicle.create({ data: { schoolId, ...input } });
}

export async function createTransportRoute(schoolId: string, value: unknown) {
  const input = routeSchema.parse(value);
  if (input.vehicleId) {
    const vehicle = await prisma.transportVehicle.findFirst({ where: { id: input.vehicleId, schoolId, active: true }, select: { id: true } });
    if (!vehicle) throw new Error("Select an active vehicle from this school.");
  }
  return prisma.transportRoute.create({ data: { schoolId, ...input } });
}

export async function createTransportStop(schoolId: string, value: unknown) {
  const input = stopSchema.parse(value);
  const route = await prisma.transportRoute.findFirst({ where: { id: input.routeId, schoolId, active: true }, select: { id: true } });
  if (!route) throw new Error("Select an active route from this school.");
  return prisma.transportStop.create({ data: { schoolId, ...input } });
}

export async function assignStudentTransport(schoolId: string, value: unknown) {
  const input = assignmentSchema.parse(value);
  const [enrollment, route] = await Promise.all([
    prisma.studentEnrollment.findFirst({
      where: { schoolId, studentId: input.studentId, academicYearId: input.academicYearId, active: true },
      select: { id: true, studentId: true },
    }),
    prisma.transportRoute.findFirst({
      where: { id: input.routeId, schoolId, active: true },
      select: { id: true, stops: { where: { id: input.stopId, schoolId, active: true }, select: { id: true } } },
    }),
  ]);
  if (!enrollment) throw new Error("The student does not have an active enrollment for this academic year.");
  if (!route || route.stops.length !== 1) throw new Error("Select a valid stop from the chosen route.");

  const startDate = new Date(`${input.startDate}T00:00:00.000Z`);
  return prisma.$transaction(async (tx) => {
    await tx.studentTransportAssignment.updateMany({
      where: { schoolId, studentEnrollmentId: enrollment.id, active: true },
      data: { active: false, endDate: startDate },
    });
    const assignment = await tx.studentTransportAssignment.create({
      data: {
        schoolId,
        studentEnrollmentId: enrollment.id,
        routeId: input.routeId,
        stopId: input.stopId,
        pickupEnabled: input.pickupEnabled,
        dropEnabled: input.dropEnabled,
        startDate,
        notes: input.notes,
      },
    });
    await tx.student.update({ where: { id: enrollment.studentId }, data: { transportRequired: true } });
    return assignment;
  });
}

export async function archiveTransportAssignment(schoolId: string, assignmentId: string) {
  const assignment = await prisma.studentTransportAssignment.findFirst({
    where: { id: assignmentId, schoolId, active: true },
    select: { id: true, studentEnrollment: { select: { studentId: true } } },
  });
  if (!assignment) throw new Error("Transport assignment not found.");
  return prisma.$transaction(async (tx) => {
    await tx.studentTransportAssignment.update({ where: { id: assignment.id }, data: { active: false, endDate: new Date() } });
    const remaining = await tx.studentTransportAssignment.count({
      where: { schoolId, active: true, studentEnrollment: { studentId: assignment.studentEnrollment.studentId } },
    });
    if (remaining === 0) {
      await tx.student.update({ where: { id: assignment.studentEnrollment.studentId }, data: { transportRequired: false } });
    }
    return { id: assignment.id, active: false };
  });
}
