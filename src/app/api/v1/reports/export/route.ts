import { NextResponse } from "next/server";

import { getSchoolReport } from "@/features/reports/report.service";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function row(...values: Array<string | number>) {
  return values.map(csvCell).join(",");
}

export async function GET(request: Request) {
  const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  const { searchParams } = new URL(request.url);
  const report = await getSchoolReport(membership.schoolId, {
    academicYearId: searchParams.get("academicYearId") || undefined,
    classId: searchParams.get("classId") || undefined,
    sectionId: searchParams.get("sectionId") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
  });

  if (!report) {
    return NextResponse.json({ success: false, message: "Create an academic year before exporting reports." }, { status: 404 });
  }

  const lines = [
    row("SchoolDB Reports & Analytics"),
    row("Academic year", report.scope.academicYearName),
    row("Class", report.scope.className),
    row("Section", report.scope.sectionName),
    row("Period", `${report.scope.from} to ${report.scope.to}`),
    "",
    row("Overview", "Value"),
    row("Students", report.students.total),
    row("Attendance percentage", `${report.attendance.percentage}%`),
    row("Attendance sessions", report.attendance.sessions),
    row("Fees collected", report.fees.collected),
    row("Outstanding fees", report.fees.outstanding),
    row("Average exam score", `${report.academics.averagePercentage}%`),
    row("Exam pass percentage", `${report.academics.passPercentage}%`),
    row("Homework published", report.academics.homework),
    row("Overdue library loans", report.operations.overdueLoans),
    row("Transport assignments", report.operations.transportAssignments),
    "",
    row("Attendance", "Count"),
    row("Present", report.attendance.present),
    row("Absent", report.attendance.absent),
    row("Late", report.attendance.late),
    row("Leave", report.attendance.leave),
    "",
    row("Class strength", "Students"),
    ...report.students.classes.map((item) => row(item.name, item.count)),
    "",
    row("Subject performance", "Entries", "Average %", "Pass %"),
    ...report.academics.subjects.map((item) => row(item.name, item.entries, item.averagePercentage, item.passPercentage)),
    "",
    row("Low attendance students", "Admission no.", "Class", "Section", "Present", "Total", "Attendance %"),
    ...report.attendance.low.map((item) => row(item.fullName, item.admissionNo, item.className, item.sectionName, item.present, item.total, item.percentage)),
  ];

  await recordAuditLog({
    actor: membership,
    module: "SYSTEM",
    action: "EXPORT",
    entityType: "REPORT",
    summary: `Exported the school report for ${report.scope.academicYearName}, ${report.scope.className}, ${report.scope.sectionName}.`,
    metadata: { academicYearId: report.scope.academicYearId, classId: report.scope.classId || null, sectionId: report.scope.sectionId || null, from: report.scope.from, to: report.scope.to },
  });

  const filename = `schooldb-report-${report.scope.from}-${report.scope.to}.csv`;
  return new NextResponse(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
