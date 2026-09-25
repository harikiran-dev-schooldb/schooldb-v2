import { PageHeader } from "@/components/common/PageHeader";
import { TeacherTimetableContainer } from "@/features/timetable";

export default function TeacherTimetablePage() {
  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Teacher Timetable"
        description="View the weekly teaching schedule, subjects, classes, and sections assigned to a teacher."
      />

      <section className="premium-card overflow-hidden rounded-3xl bg-white p-3 md:p-5">
        <TeacherTimetableContainer />
      </section>
    </div>
  );
}
