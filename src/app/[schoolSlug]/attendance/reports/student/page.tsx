import { StudentAttendanceReport } from "@/features/attendance/components/StudentAttendanceReport";
import { requireTenant } from "@/lib/auth";

export default async function StudentAttendanceReportPage() {
  await requireTenant();

  return (
    <div className="container mx-auto py-6">
      <StudentAttendanceReport />
    </div>
  );
}
