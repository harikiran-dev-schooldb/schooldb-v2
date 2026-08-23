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
        <TabsList className="h-11 rounded-xl border bg-muted/50 p-1">
          <TabsTrigger
            value="grid"
            className="rounded-lg px-5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Weekly View
          </TabsTrigger>

          <TabsTrigger
            value="manage"
            className="rounded-lg px-5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
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
