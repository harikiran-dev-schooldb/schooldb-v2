import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { getSchoolReport } from "@/features/reports/report.service";

export async function GET() {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const report = await getSchoolReport(membership.schoolId, {});

    if (!report) return ApiResponse.success({ available: false });

    return ApiResponse.success({
      available: true,
      scope: report.scope,
      students: {
        total: report.students.total,
        classes: report.students.classes.slice(0, 8),
      },
      attendance: {
        percentage: report.attendance.percentage,
        sessions: report.attendance.sessions,
        total: report.attendance.total,
        lowCount: report.attendance.low.length,
        daily: report.attendance.daily.map((day) => ({ date: day.date, absent: day.absent })),
      },
      fees: {
        collected: report.fees.collected,
        outstanding: report.fees.outstanding,
        payable: report.fees.payable,
        payments: report.fees.payments,
      },
      academics: {
        averagePercentage: report.academics.averagePercentage,
        passPercentage: report.academics.passPercentage,
        homework: report.academics.homework,
        subjects: report.academics.subjects.slice(0, 6),
      },
      operations: report.operations,
    });
  });
}
