import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AddTimetableButton, TimetableTable } from "@/features/timetable";

import { ClassTimetable } from "@/features/timetable/components/ClassTimetable";

export default function TimetablePage() {
  return (
    <>
      <PageHeader
        title="Timetable"
        description="Plan, manage and review the school's weekly schedule."
        action={<AddTimetableButton />}
      />

      <Tabs defaultValue="grid" className="mt-6 space-y-5">
        <TabsList className="grid w-full grid-cols-2 sm:w-[420px]">
          <TabsTrigger value="grid">
            Weekly View
          </TabsTrigger>

          <TabsTrigger value="manage">
            Manage Entries
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-0">
          <ClassTimetable />
        </TabsContent>

        <TabsContent value="manage" className="mt-0">
          <TimetableTable />
        </TabsContent>
      </Tabs>
    </>
  );
}
