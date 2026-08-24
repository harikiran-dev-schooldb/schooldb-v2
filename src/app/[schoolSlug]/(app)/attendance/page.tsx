import { AttendancePage } from "@/features/attendance/components/AttendancePage";
import { requireTenant } from "@/lib/auth";

type Props = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

export default async function AttendanceRoutePage({ params }: Props) {
  const { schoolSlug } = await params;

  await requireTenant();

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <AttendancePage schoolSlug={schoolSlug} />
    </div>
  );
}
