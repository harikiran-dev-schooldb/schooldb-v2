import { PageHeader } from "@/components/common/PageHeader";
import { AddTimetableButton, TimetableTable } from "@/features/timetable";

export default function TimetablePage() {
  return (
    <>
      <PageHeader
        title="Timetable"
        description="Manage school timetable."
        action={<AddTimetableButton />}
      />

      <TimetableTable />
    </>
  );
}
