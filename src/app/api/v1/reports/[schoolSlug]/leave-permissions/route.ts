import { NextRequest, NextResponse } from "next/server";

import { listStaffLeaveRequests } from "@/features/leave-requests/service";
import { prisma } from "@/lib/prisma";
import { createSchoolReportWorkbook, reportDateRange, safeReportFilename } from "@/lib/reports/excel";

export const runtime = "nodejs";

const typeLabel: Record<string, string> = {
  LEAVE: "Leave",
  LATE_ARRIVAL: "Late Arrival",
  EARLY_DEPARTURE: "Early Departure",
  HALF_DAY: "Half Day",
  PERMISSION: "Permission",
};

function dateText(date: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const search = request.nextUrl.searchParams;
  const type = search.get("type") ?? "ALL";
  const from = search.get("from") || undefined;
  const to = search.get("to") || undefined;
  const classId = search.get("classId") || undefined;
  const sectionId = search.get("sectionId") || undefined;

  const school = await prisma.school.findUnique({ where: { slug: schoolSlug }, select: { name: true } });
  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

  const allRows = await listStaffLeaveRequests(schoolSlug, { classId, sectionId, from, to });
  const rows = type === "ALL" ? allRows : allRows.filter((row) => row.requestType === type);

  const workbook = await createSchoolReportWorkbook({
    schoolName: school.name,
    reportName: "Leave & Permission Report",
    periodLabel: reportDateRange(from, to),
    sheetName: "Leave Permissions",
    rows,
    columns: [
      { header: "S.No", key: "serial", width: 8, value: (_row, index) => index + 1 },
      { header: "Admission No", key: "admissionNo", width: 16, value: (row) => row.student.admissionNo },
      { header: "Student Name", key: "studentName", width: 28, value: (row) => row.student.fullName },
      { header: "Class", key: "class", width: 12, value: (row) => row.enrollment.class.name },
      { header: "Section", key: "section", width: 10, value: (row) => row.enrollment.section.name },
      { header: "Roll No", key: "rollNo", width: 10, value: (row) => row.enrollment.rollNo },
      { header: "Request Type", key: "requestType", width: 18, value: (row) => typeLabel[row.requestType] ?? row.requestType },
      { header: "From Date", key: "startDate", width: 14, value: (row) => dateText(row.startDate) },
      { header: "To Date", key: "endDate", width: 14, value: (row) => dateText(row.endDate) },
      { header: "From / Arrival Time", key: "startTime", width: 20, value: (row) => row.startTime },
      { header: "To Time", key: "endTime", width: 14, value: (row) => row.endTime },
      { header: "Reason", key: "reason", width: 36, value: (row) => row.reason },
      { header: "Status", key: "status", width: 14, value: (row) => row.status },
      { header: "Decision Note", key: "decisionNote", width: 30, value: (row) => row.decisionNote },
    ],
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${safeReportFilename(school.name)}-leave-permission-report.xlsx`;
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
