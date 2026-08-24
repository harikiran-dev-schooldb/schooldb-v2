import { PageHeader } from "@/components/common/PageHeader";
import { DailyTimetableContainer } from "@/features/timetable/components/DailyTimetableContainer";

export default function DailyTimetablePage() {
  return (
    <>
      <PageHeader
        title="Daily Timetable"
        description="View the complete teaching schedule for a selected day."
      />

      <div className="mt-6">
        <DailyTimetableContainer />
      </div>
    </>
  );
}
