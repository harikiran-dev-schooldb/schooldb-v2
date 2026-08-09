import { TeacherTimetableContainer } from "@/features/timetable";

export default function TeacherTimetablePage() {
  return (
    <div className="container mx-auto space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold">Teacher Timetable</h1>

        <p className="text-sm text-muted-foreground">
          View the weekly timetable for a teacher.
        </p>
      </div>

      <TeacherTimetableContainer />
    </div>
  );
}
