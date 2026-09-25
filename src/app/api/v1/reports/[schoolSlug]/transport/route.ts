import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSchoolReportWorkbook, safeReportFilename } from "@/lib/reports/excel";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  const q = request.nextUrl.searchParams;
  const report = q.get("report") === "students" ? "students" : q.get("report") === "routes" ? "routes" : "fleet";
  const school = await prisma.school.findFirst({ where: { id: tenant.schoolId, slug: schoolSlug }, select: { name: true } });
  if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

  let workbook;
  if (report === "fleet") {
    const rows = await prisma.transportVehicle.findMany({ where: { schoolId: tenant.schoolId }, orderBy: [{ active: "desc" }, { registrationNo: "asc" }], select: { registrationNo: true, name: true, type: true, capacity: true, driverName: true, driverPhone: true, attendantName: true, attendantPhone: true, active: true, _count: { select: { routes: true } } } });
    workbook = await createSchoolReportWorkbook({ schoolName: school.name, reportName: "Transport Fleet Report", periodLabel: "Current Vehicle Register", sheetName: "Fleet", rows, columns: [
      { header: "S.No", key: "serial", width: 8, value: (_r, i) => i + 1 },
      { header: "Registration No", key: "registration", width: 20, value: r => r.registrationNo },
      { header: "Vehicle Name", key: "name", width: 22, value: r => r.name },
      { header: "Type", key: "type", width: 14, value: r => r.type.replaceAll("_", " ") },
      { header: "Capacity", key: "capacity", width: 12, value: r => r.capacity },
      { header: "Driver Name", key: "driver", width: 24, value: r => r.driverName },
      { header: "Driver Phone", key: "driverPhone", width: 16, value: r => r.driverPhone },
      { header: "Attendant Name", key: "attendant", width: 24, value: r => r.attendantName },
      { header: "Attendant Phone", key: "attendantPhone", width: 16, value: r => r.attendantPhone },
      { header: "Routes", key: "routes", width: 10, value: r => r._count.routes },
      { header: "Status", key: "status", width: 12, value: r => r.active ? "ACTIVE" : "ARCHIVED" },
    ]});
  } else if (report === "routes") {
    const routes = await prisma.transportRoute.findMany({ where: { schoolId: tenant.schoolId }, orderBy: [{ active: "desc" }, { code: "asc" }], select: { code: true, name: true, pickupStart: true, dropStart: true, active: true, vehicle: { select: { registrationNo: true, name: true } }, stops: { orderBy: { sequence: "asc" }, select: { name: true, sequence: true, pickupTime: true, dropTime: true, monthlyFee: true, active: true } } } });
    const rows = routes.flatMap(r => r.stops.map(s => ({ ...r, stop: s })));
    workbook = await createSchoolReportWorkbook({ schoolName: school.name, reportName: "Transport Routes & Stops Report", periodLabel: "Current Route Register", sheetName: "Routes & Stops", rows, columns: [
      { header: "S.No", key: "serial", width: 8, value: (_r, i) => i + 1 },
      { header: "Route Code", key: "code", width: 14, value: r => r.code },
      { header: "Route Name", key: "route", width: 28, value: r => r.name },
      { header: "Vehicle", key: "vehicle", width: 22, value: r => r.vehicle?.registrationNo },
      { header: "Pickup Starts", key: "pickupStart", width: 15, value: r => r.pickupStart },
      { header: "Drop Starts", key: "dropStart", width: 15, value: r => r.dropStart },
      { header: "Stop Sequence", key: "sequence", width: 14, value: r => r.stop.sequence },
      { header: "Stop Name", key: "stop", width: 28, value: r => r.stop.name },
      { header: "Pickup Time", key: "pickup", width: 14, value: r => r.stop.pickupTime },
      { header: "Drop Time", key: "drop", width: 14, value: r => r.stop.dropTime },
      { header: "Monthly Fee", key: "fee", width: 15, value: r => r.stop.monthlyFee == null ? null : Number(r.stop.monthlyFee), numFmt: "₹#,##0.00" },
      { header: "Route Status", key: "routeStatus", width: 14, value: r => r.active ? "ACTIVE" : "ARCHIVED" },
      { header: "Stop Status", key: "stopStatus", width: 14, value: r => r.stop.active ? "ACTIVE" : "ARCHIVED" },
    ]});
  } else {
    const routeId = q.get("routeId") || undefined;
    const classId = q.get("classId") || undefined;
    const sectionId = q.get("sectionId") || undefined;
    const rows = await prisma.studentTransportAssignment.findMany({ where: { schoolId: tenant.schoolId, active: true, ...(routeId ? { routeId } : {}), studentEnrollment: { ...(classId ? { classId } : {}), ...(sectionId ? { sectionId } : {}) } }, orderBy: [{ route: { code: "asc" } }, { studentEnrollment: { rollNo: "asc" } }], select: { pickupEnabled: true, dropEnabled: true, startDate: true, endDate: true, notes: true, studentEnrollment: { select: { rollNo: true, academicYear: { select: { name: true } }, student: { select: { admissionNo: true, fullName: true } }, class: { select: { name: true } }, section: { select: { name: true } } } }, route: { select: { code: true, name: true, vehicle: { select: { registrationNo: true } } } }, stop: { select: { name: true, pickupTime: true, dropTime: true, monthlyFee: true } } } });
    workbook = await createSchoolReportWorkbook({ schoolName: school.name, reportName: "Student Transport Assignment Report", periodLabel: "Active Student Transport Assignments", sheetName: "Student Transport", rows, columns: [
      { header: "S.No", key: "serial", width: 8, value: (_r, i) => i + 1 },
      { header: "Admission No", key: "admission", width: 16, value: r => r.studentEnrollment.student.admissionNo },
      { header: "Student Name", key: "student", width: 30, value: r => r.studentEnrollment.student.fullName },
      { header: "Academic Year", key: "year", width: 16, value: r => r.studentEnrollment.academicYear.name },
      { header: "Class", key: "class", width: 12, value: r => r.studentEnrollment.class.name },
      { header: "Section", key: "section", width: 10, value: r => r.studentEnrollment.section.name },
      { header: "Roll No", key: "roll", width: 10, value: r => r.studentEnrollment.rollNo },
      { header: "Route Code", key: "routeCode", width: 14, value: r => r.route.code },
      { header: "Route Name", key: "route", width: 26, value: r => r.route.name },
      { header: "Vehicle", key: "vehicle", width: 18, value: r => r.route.vehicle?.registrationNo },
      { header: "Stop", key: "stop", width: 26, value: r => r.stop.name },
      { header: "Pickup", key: "pickupEnabled", width: 11, value: r => r.pickupEnabled ? "YES" : "NO" },
      { header: "Pickup Time", key: "pickupTime", width: 14, value: r => r.stop.pickupTime },
      { header: "Drop", key: "dropEnabled", width: 11, value: r => r.dropEnabled ? "YES" : "NO" },
      { header: "Drop Time", key: "dropTime", width: 14, value: r => r.stop.dropTime },
      { header: "Monthly Fee", key: "fee", width: 15, value: r => r.stop.monthlyFee == null ? null : Number(r.stop.monthlyFee), numFmt: "₹#,##0.00" },
      { header: "Start Date", key: "start", width: 15, value: r => r.startDate, numFmt: "dd-mm-yyyy" },
      { header: "Notes", key: "notes", width: 30, value: r => r.notes },
    ]});
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${safeReportFilename(school.name)}-transport-${report}-report.xlsx"`, "Cache-Control": "no-store" } });
}
