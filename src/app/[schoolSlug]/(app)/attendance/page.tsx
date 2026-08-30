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

  return <AttendancePage schoolSlug={schoolSlug} />;
}
