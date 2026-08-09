import { ClassTimetableContainer } from "@/features/timetable/components/ClassTimetableContainer";

export default function ClassTimetablePage() {
  return (
    <div className="container mx-auto space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold">Class Timetable</h1>

        <p className="text-sm text-muted-foreground">
          View the weekly timetable for a class.
        </p>
      </div>

      <ClassTimetableContainer />
    </div>
  );
}
