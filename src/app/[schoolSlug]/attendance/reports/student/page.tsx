import { StudentAttendanceReport } from "@/features/attendance/components/StudentAttendanceReport";
import { requireTenant } from "@/lib/auth";

type Props = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

export default async function StudentAttendanceReportPage({ params }: Props) {
  await requireTenant();

  return (
    <div className="container mx-auto py-6">
      <StudentAttendanceReport />
    </div>
  );
}
