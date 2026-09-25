import { PageHeader } from "@/components/common/PageHeader";
import { DailyTimetableContainer } from "@/features/timetable/components/DailyTimetableContainer";

export default function DailyTimetablePage() {
  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Daily Timetable"
        description="View the complete teaching schedule for a selected day."
      />

      <section className="premium-card overflow-hidden rounded-3xl bg-white p-3 md:p-5">
        <DailyTimetableContainer />
      </section>
    </div>
  );
}
