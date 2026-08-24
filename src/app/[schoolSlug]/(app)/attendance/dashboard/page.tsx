// src/app/[schoolSlug]/attendance/dashboard/page.tsx

import { AttendanceDashboard } from "@/features/attendance/components/AttendanceDashboard";

type Props = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

export default async function AttendanceDashboardPage({ params }: Props) {
  const { schoolSlug } = await params;

  return <AttendanceDashboard schoolSlug={schoolSlug} />;
}
