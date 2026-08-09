import { DailyTimetableContainer } from "@/features/timetable/components/DailyTimetableContainer";

export default function DailyTimetablePage() {
  return (
    <div className="container mx-auto space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold">Daily Timetable</h1>

        <p className="text-sm text-muted-foreground">
          View all classes scheduled for a selected day.
        </p>
      </div>

      <DailyTimetableContainer />
    </div>
  );
}
