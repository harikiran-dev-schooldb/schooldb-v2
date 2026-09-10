import { AttendanceRankingPage } from "@/features/attendance/components/AttendanceRankingPage";
import { requireTenant } from "@/lib/auth";

type Props = {
  params: Promise<{ schoolSlug: string }>;
};

export default async function Page({ params }: Props) {
  const { schoolSlug } = await params;

  await requireTenant(schoolSlug);

  return <AttendanceRankingPage schoolSlug={schoolSlug} />;
}
