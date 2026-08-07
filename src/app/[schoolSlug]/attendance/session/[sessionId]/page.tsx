import { MarkAttendance } from "@/features/attendance/components/MarkAttendance";

type Props = {
  params: Promise<{
    schoolSlug: string;
    sessionId: string;
  }>;
};

export default async function AttendanceSessionPage({ params }: Props) {
  const { sessionId } = await params;

  return (
    <div className="container mx-auto py-6">
      <MarkAttendance sessionId={sessionId} />
    </div>
  );
}
