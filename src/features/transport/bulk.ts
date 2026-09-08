import { z } from "zod";

import { prisma } from "@/lib/prisma";

const MAX_ROWS = 500;
const time = z.union([
  z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  z.literal(""),
]).transform((value) => value || null);
const optionalText = (maximum: number) => z.string().trim().max(maximum).transform((value) => value || null);
const optionalBoolean = z.union([z.boolean(), z.string()]).transform((value, context) => {
  if (value === "") return null;
  if (typeof value === "boolean") return value;
  const normalized = value.trim().toLowerCase();
  if (["true", "yes", "1"].includes(normalized)) return true;
  if (["false", "no", "0"].includes(normalized)) return false;
  context.addIssue({ code: "custom", message: "Pickup and drop must use true/false, yes/no, or 1/0." });
  return z.NEVER;
});

const rowSchema = z.object({
  registrationNo: z.string().trim().min(4).max(30).transform((value) => value.toUpperCase()),
  vehicleName: optionalText(120),
  vehicleType: z.enum(["BUS", "VAN", "MINI_BUS", "OTHER"]),
  capacity: z.coerce.number().int().min(1).max(100),
  driverName: z.string().trim().min(2).max(120),
  driverPhone: z.string().trim().regex(/^\d{10}$/),
  attendantName: optionalText(120),
  attendantPhone: z.union([z.string().trim().regex(/^\d{10}$/), z.literal("")]).transform((value) => value || null),
  routeCode: z.string().trim().min(1).max(30).transform((value) => value.toUpperCase()),
  routeName: z.string().trim().min(2).max(160),
  pickupStart: time,
  dropStart: time,
  stopName: z.string().trim().min(2).max(160),
  stopSequence: z.coerce.number().int().min(1).max(999),
  pickupTime: time,
  dropTime: time,
  monthlyFee: z.union([z.coerce.number().min(0).max(1_000_000), z.literal("")]).transform((value) => value === "" ? null : value),
  academicYear: optionalText(80),
  admissionNo: optionalText(80),
  pickupEnabled: optionalBoolean,
  dropEnabled: optionalBoolean,
  startDate: z.union([z.string().date(), z.literal("")]).transform((value) => value || null),
  notes: optionalText(500),
}).superRefine((row, context) => {
  const assignmentValues = [row.academicYear, row.admissionNo, row.pickupEnabled, row.dropEnabled, row.startDate];
  const hasAssignment = assignmentValues.some((value) => value !== null);
  if (hasAssignment && assignmentValues.some((value) => value === null)) {
    context.addIssue({ code: "custom", message: "Academic year, admission number, pickup, drop and start date are required together." });
  }
  if (hasAssignment && row.pickupEnabled === false && row.dropEnabled === false) {
    context.addIssue({ code: "custom", message: "At least pickup or drop must be enabled." });
  }
});

type Row = z.infer<typeof rowSchema>;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function sameDefinition(existing: string | undefined, current: string, label: string, rowNumber: number) {
  if (existing !== undefined && existing !== current) throw new Error(`Row ${rowNumber}: Conflicting ${label} details are repeated in this file.`);
}

export async function importTransportData(schoolId: string, input: unknown) {
  if (!Array.isArray(input) || input.length === 0) throw new Error("No transport rows were provided.");
  if (input.length > MAX_ROWS) throw new Error(`Maximum ${MAX_ROWS} transport rows per import.`);

  const rows = input.map((value, index) => {
    const parsed = rowSchema.safeParse(value);
    if (!parsed.success) throw new Error(`Row ${index + 2}: ${parsed.error.issues[0]?.message ?? "Invalid transport data."}`);
    return parsed.data;
  });

  const vehicles = new Map<string, Row>();
  const vehicleSignatures = new Map<string, string>();
  const routes = new Map<string, Row>();
  const routeSignatures = new Map<string, string>();
  const stops = new Map<string, Row>();
  const stopSignatures = new Map<string, string>();
  const stopSequences = new Map<string, string>();
  const assignmentKeys = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const vehicleSignature = JSON.stringify([row.vehicleName, row.vehicleType, row.capacity, row.driverName, row.driverPhone, row.attendantName, row.attendantPhone]);
    sameDefinition(vehicleSignatures.get(row.registrationNo), vehicleSignature, `vehicle ${row.registrationNo}`, rowNumber);
    vehicleSignatures.set(row.registrationNo, vehicleSignature);
    vehicles.set(row.registrationNo, row);

    const routeSignature = JSON.stringify([row.registrationNo, row.routeName, row.pickupStart, row.dropStart]);
    sameDefinition(routeSignatures.get(row.routeCode), routeSignature, `route ${row.routeCode}`, rowNumber);
    routeSignatures.set(row.routeCode, routeSignature);
    routes.set(row.routeCode, row);

    const stopKey = `${row.routeCode}:${normalize(row.stopName)}`;
    const stopSignature = JSON.stringify([row.stopSequence, row.pickupTime, row.dropTime, row.monthlyFee]);
    sameDefinition(stopSignatures.get(stopKey), stopSignature, `stop ${row.stopName}`, rowNumber);
    stopSignatures.set(stopKey, stopSignature);
    stops.set(stopKey, row);

    const sequenceKey = `${row.routeCode}:${row.stopSequence}`;
    const previousStop = stopSequences.get(sequenceKey);
    if (previousStop && previousStop !== normalize(row.stopName)) throw new Error(`Row ${rowNumber}: Stop sequence ${row.stopSequence} is already used by another stop on route ${row.routeCode}.`);
    stopSequences.set(sequenceKey, normalize(row.stopName));

    if (row.academicYear && row.admissionNo) {
      const assignmentKey = `${normalize(row.academicYear)}:${normalize(row.admissionNo)}`;
      if (assignmentKeys.has(assignmentKey)) throw new Error(`Row ${rowNumber}: Student ${row.admissionNo} has more than one transport assignment in this file.`);
      assignmentKeys.add(assignmentKey);
    }
  });

  return prisma.$transaction(async (tx) => {
    const existingVehicles = await tx.transportVehicle.findMany({
      where: { schoolId, registrationNo: { in: [...vehicles.keys()] } },
      select: { id: true, registrationNo: true },
    });
    const existingVehicleNumbers = new Set(existingVehicles.map((item) => item.registrationNo));
    const missingVehicles = [...vehicles.values()].filter((row) => !existingVehicleNumbers.has(row.registrationNo));
    if (missingVehicles.length) {
      await tx.transportVehicle.createMany({
        data: missingVehicles.map((row) => ({
          schoolId,
          registrationNo: row.registrationNo,
          name: row.vehicleName,
          type: row.vehicleType,
          capacity: row.capacity,
          driverName: row.driverName,
          driverPhone: row.driverPhone,
          attendantName: row.attendantName,
          attendantPhone: row.attendantPhone,
        })),
      });
    }
    const resolvedVehicles = await tx.transportVehicle.findMany({
      where: { schoolId, registrationNo: { in: [...vehicles.keys()] } },
      select: { id: true, registrationNo: true },
    });
    const vehicleByNumber = new Map(resolvedVehicles.map((item) => [item.registrationNo, item.id]));

    const existingRoutes = await tx.transportRoute.findMany({
      where: { schoolId, code: { in: [...routes.keys()] } },
      select: { id: true, code: true },
    });
    const existingRouteCodes = new Set(existingRoutes.map((item) => item.code));
    const missingRoutes = [...routes.values()].filter((row) => !existingRouteCodes.has(row.routeCode));
    if (missingRoutes.length) {
      await tx.transportRoute.createMany({
        data: missingRoutes.map((row) => ({
          schoolId,
          vehicleId: vehicleByNumber.get(row.registrationNo),
          code: row.routeCode,
          name: row.routeName,
          pickupStart: row.pickupStart,
          dropStart: row.dropStart,
        })),
      });
    }
    const resolvedRoutes = await tx.transportRoute.findMany({
      where: { schoolId, code: { in: [...routes.keys()] } },
      select: { id: true, code: true },
    });
    const routeByCode = new Map(resolvedRoutes.map((item) => [item.code, item.id]));

    const existingStops = await tx.transportStop.findMany({
      where: { schoolId, routeId: { in: resolvedRoutes.map((route) => route.id) } },
      select: { id: true, routeId: true, name: true, sequence: true },
    });
    const stopByName = new Map(existingStops.map((stop) => [`${stop.routeId}:${normalize(stop.name)}`, stop]));
    const stopBySequence = new Map(existingStops.map((stop) => [`${stop.routeId}:${stop.sequence}`, stop]));
    const missingStops: Row[] = [];
    for (const row of stops.values()) {
      const routeId = routeByCode.get(row.routeCode);
      if (!routeId) throw new Error(`Unable to resolve route ${row.routeCode}.`);
      const named = stopByName.get(`${routeId}:${normalize(row.stopName)}`);
      const sequenced = stopBySequence.get(`${routeId}:${row.stopSequence}`);
      if (named && named.sequence !== row.stopSequence) throw new Error(`Stop ${row.stopName} already uses sequence ${named.sequence} on route ${row.routeCode}.`);
      if (sequenced && normalize(sequenced.name) !== normalize(row.stopName)) throw new Error(`Sequence ${row.stopSequence} is already used by ${sequenced.name} on route ${row.routeCode}.`);
      if (!named) missingStops.push(row);
    }
    if (missingStops.length) {
      await tx.transportStop.createMany({
        data: missingStops.map((row) => ({
          schoolId,
          routeId: routeByCode.get(row.routeCode)!,
          name: row.stopName,
          sequence: row.stopSequence,
          pickupTime: row.pickupTime,
          dropTime: row.dropTime,
          monthlyFee: row.monthlyFee,
        })),
      });
    }
    const resolvedStops = await tx.transportStop.findMany({
      where: { schoolId, routeId: { in: resolvedRoutes.map((route) => route.id) } },
      select: { id: true, routeId: true, name: true },
    });
    const resolvedStopByName = new Map(resolvedStops.map((stop) => [`${stop.routeId}:${normalize(stop.name)}`, stop.id]));

    const assignmentRows = rows.filter((row) => row.academicYear && row.admissionNo);
    let assignmentsCreated = 0;
    let assignmentsSkipped = 0;
    if (assignmentRows.length) {
      const [academicYears, enrollments] = await Promise.all([
        tx.academicYear.findMany({
          where: { schoolId },
          select: { id: true, name: true },
        }),
        tx.studentEnrollment.findMany({
          where: {
            schoolId,
            active: true,
            student: {
              admissionNo: {
                in: [...new Set(assignmentRows.map((row) => row.admissionNo!))],
                mode: "insensitive",
              },
            },
          },
          select: { id: true, academicYearId: true, studentId: true, student: { select: { admissionNo: true } } },
        }),
      ]);
      const academicYearByName = new Map(academicYears.map((year) => [normalize(year.name), year.id]));
      const enrollmentByYearAndAdmission = new Map(enrollments.map((enrollment) => [`${enrollment.academicYearId}:${normalize(enrollment.student.admissionNo)}`, enrollment]));
      const preparedAssignments = assignmentRows.map((row) => {
        const academicYearId = academicYearByName.get(normalize(row.academicYear!));
        if (!academicYearId) throw new Error(`Academic year not found: ${row.academicYear}.`);
        const enrollment = enrollmentByYearAndAdmission.get(`${academicYearId}:${normalize(row.admissionNo!)}`);
        if (!enrollment) throw new Error(`Active enrollment not found for admission ${row.admissionNo} in ${row.academicYear}.`);
        const routeId = routeByCode.get(row.routeCode)!;
        const stopId = resolvedStopByName.get(`${routeId}:${normalize(row.stopName)}`);
        if (!stopId) throw new Error(`Unable to resolve stop ${row.stopName} on route ${row.routeCode}.`);
        return {
          schoolId,
          studentEnrollmentId: enrollment.id,
          studentId: enrollment.studentId,
          routeId,
          stopId,
          pickupEnabled: row.pickupEnabled!,
          dropEnabled: row.dropEnabled!,
          startDate: new Date(`${row.startDate}T00:00:00.000Z`),
          notes: row.notes,
        };
      });
      const activeAssignments = await tx.studentTransportAssignment.findMany({
        where: { schoolId, active: true, studentEnrollmentId: { in: preparedAssignments.map((item) => item.studentEnrollmentId) } },
        select: { studentEnrollmentId: true, routeId: true, stopId: true, pickupEnabled: true, dropEnabled: true },
      });
      const activeByEnrollment = new Map(activeAssignments.map((item) => [item.studentEnrollmentId, item]));
      const toCreate = preparedAssignments.filter((item) => {
        const current = activeByEnrollment.get(item.studentEnrollmentId);
        const unchanged = current && current.routeId === item.routeId && current.stopId === item.stopId && current.pickupEnabled === item.pickupEnabled && current.dropEnabled === item.dropEnabled;
        if (unchanged) assignmentsSkipped += 1;
        return !unchanged;
      });
      if (toCreate.length) {
        await tx.studentTransportAssignment.updateMany({
          where: { schoolId, active: true, studentEnrollmentId: { in: toCreate.map((item) => item.studentEnrollmentId) } },
          data: { active: false, endDate: new Date() },
        });
        await tx.studentTransportAssignment.createMany({
          data: toCreate.map((item) => ({
            schoolId: item.schoolId,
            studentEnrollmentId: item.studentEnrollmentId,
            routeId: item.routeId,
            stopId: item.stopId,
            pickupEnabled: item.pickupEnabled,
            dropEnabled: item.dropEnabled,
            startDate: item.startDate,
            notes: item.notes,
          })),
        });
        await tx.student.updateMany({
          where: { schoolId, id: { in: [...new Set(toCreate.map((item) => item.studentId))] } },
          data: { transportRequired: true },
        });
        assignmentsCreated = toCreate.length;
      }
    }

    return {
      vehiclesCreated: missingVehicles.length,
      routesCreated: missingRoutes.length,
      stopsCreated: missingStops.length,
      assignmentsCreated,
      assignmentsSkipped,
    };
  });
}
