import { NextRequest, NextResponse } from "next/server";

import { createStudentComprehensiveWorkbook } from "@/features/students/services/student-comprehensive-export.service";
import { getStudentComprehensiveReport } from "@/features/students/services/student-comprehensive-report.service";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { safeReportFilename } from "@/lib/reports/excel";
import { ApiResponse } from "@/lib/response";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const { id } = await params;
    const report = await getStudentComprehensiveReport(id, tenant.schoolId);

    if (request.nextUrl.searchParams.get("format") !== "xlsx") {
      return ApiResponse.success(report);
    }

    const generatedBy =
      [tenant.user.firstName, tenant.user.lastName].filter(Boolean).join(" ") ||
      tenant.user.email ||
      "SchoolDB authorized user";
    const workbook = createStudentComprehensiveWorkbook(report, generatedBy);
    const buffer = await workbook.xlsx.writeBuffer();
    await recordAuditLog({
      actor: tenant,
      module: "STUDENTS",
      action: "EXPORT",
      entityType: "STUDENT_COMPLETE_REPORT",
      entityId: id,
      summary: `Exported the complete student report for ${report.studentName} (${report.admissionNo}).`,
      metadata: {
        admissionNo: report.admissionNo,
        format: "xlsx",
        sheets: report.sections.map((section) => section.title),
      },
    });

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeReportFilename(report.admissionNo)}-complete-student-report.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
