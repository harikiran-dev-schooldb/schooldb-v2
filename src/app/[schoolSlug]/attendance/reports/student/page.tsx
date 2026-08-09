import { StudentAttendanceReport } from "@/features/attendance/components/StudentAttendanceReport";
import { requireTenant } from "@/lib/auth";

type Props = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

export default async function StudentAttendanceReportPage({ params }: Props) {
  const { schoolSlug } = await params;

  await requireTenant();

  return (
    <div className="container mx-auto py-6">
      <StudentAttendanceReport schoolSlug={schoolSlug} />
    </div>
  );
}
