import { AttendanceHistory } from "@/features/attendance/components/AttendanceHistory";
import { requireTenant } from "@/lib/auth";

type Props = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

export default async function AttendanceHistoryPage({ params }: Props) {
  const { schoolSlug } = await params;

  await requireTenant();

  return (
    <div className="container mx-auto py-6">
      <AttendanceHistory schoolSlug={schoolSlug} />
    </div>
  );
}
