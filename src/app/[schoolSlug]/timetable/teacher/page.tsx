import { PageHeader } from "@/components/common/PageHeader";
import { TeacherTimetableContainer } from "@/features/timetable";

export default function TeacherTimetablePage() {
  return (
    <>
      <PageHeader
        title="Teacher Timetable"
        description="View the weekly teaching schedule, subjects, classes, and sections assigned to a teacher."
      />

      <div className="mt-6">
        <TeacherTimetableContainer />
      </div>
    </>
  );
}
