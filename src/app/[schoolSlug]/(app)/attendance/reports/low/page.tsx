import { LowAttendanceReport } from "@/features/attendance/components/LowAttendanceReport";
import { requireTenant } from "@/lib/auth";

type Props = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

export default async function LowAttendancePage({ params }: Props) {
  const { schoolSlug } = await params;

  await requireTenant();

  return (
    <div className="container mx-auto py-6">
      <LowAttendanceReport schoolSlug={schoolSlug} />
    </div>
  );
}
