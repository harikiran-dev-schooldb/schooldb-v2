import { ClassAttendanceReport } from "@/features/attendance/components/ClassAttendanceReport";
import { requireTenant } from "@/lib/auth";

type Props = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

export default async function ClassAttendanceReportPage({ params }: Props) {
  const { schoolSlug } = await params;

  await requireTenant();

  return (
    <div className="container mx-auto py-6">
      <ClassAttendanceReport schoolSlug={schoolSlug} />
    </div>
  );
}
