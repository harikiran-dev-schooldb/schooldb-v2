import { NextRequest, NextResponse } from "next/server";

import { attendanceService } from "@/features/attendance/services/attendance.service";
import { PERMISSIONS } from "@/lib/access-control";
import { requirePermission, requireTeacherClassSection } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSchoolReportWorkbook, reportDateRange, safeReportFilename } from "@/lib/reports/excel";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const tenant = await requirePermission(PERMISSIONS.ATTENDANCE_READ);
  const search = request.nextUrl.searchParams;
  const academicYearId = search.get("academicYearId") ?? "";
  const classId = search.get("classId") ?? "";
  const sectionId = search.get("sectionId") ?? "";
  const fromDate = search.get("fromDate") || undefined;
  const toDate = search.get("toDate") || undefined;

  if (!academicYearId || !classId || !sectionId) {
    return NextResponse.json({ error: "Academic year, class and section are required." }, { status: 400 });
  }

  await requireTeacherClassSection(classId, sectionId);

  const [school, classInfo, section, report] = await Promise.all([
    prisma.school.findFirst({ where: { id: tenant.schoolId, slug: schoolSlug }, select: { name: true } }),
    prisma.class.findFirst({ where: { id: classId, schoolId: tenant.schoolId }, select: { name: true } }),
    prisma.section.findFirst({ where: { id: sectionId, schoolId: tenant.schoolId }, select: { name: true } }),
    attendanceService.classAttendanceReport(tenant.schoolId, academicYearId, classId, sectionId, fromDate, toDate),
  ]);
  if (!school || !classInfo || !section) return NextResponse.json({ error: "Report scope not found." }, { status: 404 });

  const workbook = await createSchoolReportWorkbook({
    schoolName: school.name,
    reportName: `Class Attendance Report - ${classInfo.name} ${section.name}`,
    periodLabel: reportDateRange(fromDate, toDate),
    sheetName: "Attendance",
    rows: report.students,
    columns: [
      { header: "S.No", key: "serial", width: 8, value: (_row, index) => index + 1 },
      { header: "Roll No", key: "rollNo", width: 10, value: (row) => row.rollNo },
      { header: "Admission No", key: "admissionNo", width: 16, value: (row) => row.admissionNo },
      { header: "Student Name", key: "fullName", width: 30, value: (row) => row.fullName },
      { header: "Total Sessions", key: "total", width: 15, value: (row) => row.total },
      { header: "Present", key: "present", width: 12, value: (row) => row.present },
      { header: "Absent", key: "absent", width: 12, value: (row) => row.absent },
      { header: "Late", key: "late", width: 10, value: (row) => row.late },
      { header: "Leave", key: "leave", width: 10, value: (row) => row.leave },
      { header: "Attendance %", key: "attendancePercentage", width: 15, value: (row) => row.attendancePercentage, numFmt: "0.00" },
    ],
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${safeReportFilename(school.name)}-${safeReportFilename(classInfo.name)}-${safeReportFilename(section.name)}-attendance.xlsx`;
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
