import { NextRequest, NextResponse } from "next/server";

import { examResultService } from "@/features/exams/services/exam-result.service";
import { requireTenant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSchoolReportWorkbook, safeReportFilename } from "@/lib/reports/excel";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ schoolSlug: string; examId: string }> }) {
  const { schoolSlug, examId } = await params;
  const tenant = await requireTenant();
  const classId = request.nextUrl.searchParams.get("classId");
  const sectionId = request.nextUrl.searchParams.get("sectionId");
  if (!classId) return NextResponse.json({ error: "Select a class." }, { status: 400 });

  const [school, classInfo, sectionInfo, data] = await Promise.all([
    prisma.school.findFirst({ where: { id: tenant.schoolId, slug: schoolSlug }, select: { name: true } }),
    prisma.class.findFirst({ where: { id: classId, schoolId: tenant.schoolId }, select: { name: true } }),
    sectionId ? prisma.section.findFirst({ where: { id: sectionId, classId, class: { schoolId: tenant.schoolId } }, select: { name: true } }) : Promise.resolve(null),
    examResultService.getResults({ examId, schoolId: tenant.schoolId, classId, sectionId }),
  ]);
  if (!school || !classInfo) return NextResponse.json({ error: "School or class not found." }, { status: 404 });

  const scope = sectionInfo ? `${classInfo.name} - ${sectionInfo.name}` : classInfo.name;
  const workbook = await createSchoolReportWorkbook({
    schoolName: school.name,
    reportName: `${data.exam.name} - Results Report`,
    periodLabel: `Class / Section: ${scope} | Academic Year: ${data.exam.academicYear.name}`,
    sheetName: "Results",
    rows: data.results,
    columns: [
      { header: "S.No", key: "serial", width: 8, value: (_row, index) => index + 1 },
      { header: "Rank", key: "rank", width: 9, value: (row) => row.rank },
      { header: "Admission No", key: "admissionNo", width: 16, value: (row) => row.admissionNo },
      { header: "Student Name", key: "studentName", width: 30, value: (row) => row.fullName },
      { header: "Subjects", key: "subjects", width: 11, value: (row) => row.subjects },
      { header: "Marks Obtained", key: "obtained", width: 17, value: (row) => row.totalObtained },
      { header: "Maximum Marks", key: "maximum", width: 16, value: (row) => row.totalMaxMarks },
      { header: "Percentage", key: "percentage", width: 14, value: (row) => row.percentage, numFmt: "0.00%" },
      { header: "Passed Subjects", key: "passed", width: 16, value: (row) => row.passedSubjects },
      { header: "Failed Subjects", key: "failed", width: 16, value: (row) => row.failedSubjects },
      { header: "Absent Subjects", key: "absent", width: 16, value: (row) => row.absentSubjects },
      { header: "Pending Subjects", key: "pending", width: 16, value: (row) => row.pendingSubjects },
      { header: "Result", key: "status", width: 12, value: (row) => row.status },
    ],
  });
  const sheet = workbook.getWorksheet("Results");
  if (sheet) {
    const percentageColumn = sheet.getColumn(8);
    for (let row = 6; row <= data.results.length + 5; row += 1) {
      const cell = sheet.getCell(row, percentageColumn.number);
      if (typeof cell.value === "number") cell.value = cell.value / 100;
    }
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${safeReportFilename(school.name)}-${safeReportFilename(data.exam.name)}-${safeReportFilename(scope)}-results.xlsx"`,
    "Cache-Control": "no-store",
  } });
}
