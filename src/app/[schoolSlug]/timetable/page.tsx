import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddTimetableButton, TimetableTable } from "@/features/timetable";
import { ClassTimetable } from "@/features/timetable/components/ClassTimetable";

export default function TimetablePage() {
  return (
    <>
      <PageHeader
        title="Timetable"
        description="Manage school timetable."
        action={<AddTimetableButton />}
      />

      <Tabs defaultValue="grid">
        <TabsList>
          <TabsTrigger value="grid">Timetable</TabsTrigger>

          <TabsTrigger value="manage">Manage</TabsTrigger>
        </TabsList>

        <TabsContent value="grid">
          <ClassTimetable />
        </TabsContent>

        <TabsContent value="manage">
          <TimetableTable />
        </TabsContent>
      </Tabs>
    </>
  );
}
