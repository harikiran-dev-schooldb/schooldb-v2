import { PageHeader } from "@/components/common/PageHeader";
import { ClassTimetableContainer } from "@/features/timetable/components/ClassTimetableContainer";

export default function ClassTimetablePage() {
  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Class Timetable"
        description="View and manage the weekly academic schedule for each class."
      />

      <section className="premium-card overflow-hidden rounded-3xl bg-white p-3 md:p-5">
        <ClassTimetableContainer />
      </section>
    </div>
  );
}
