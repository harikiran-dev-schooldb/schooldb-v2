import { PageHeader } from "@/components/common/PageHeader";
import { ClassTimetableContainer } from "@/features/timetable/components/ClassTimetableContainer";

export default function ClassTimetablePage() {
  return (
    <>
      <PageHeader
        title="Class Timetable"
        description="View and manage the weekly academic schedule for each class."
      />

      <div className="mt-6">
        <ClassTimetableContainer />
      </div>
    </>
  );
}
