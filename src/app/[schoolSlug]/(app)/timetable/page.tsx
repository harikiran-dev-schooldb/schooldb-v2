import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { readSetupParam, type SetupSearchParams } from "@/features/school-setup/setup-readiness";

import { AddTimetableButton, TimetableTable } from "@/features/timetable";

import { ClassTimetable } from "@/features/timetable/components/ClassTimetable";

export default async function TimetablePage({ searchParams }: { searchParams: SetupSearchParams }) {
  const params = await searchParams;
  const academicYearId = readSetupParam(params, "academicYearId");
  const classId = readSetupParam(params, "classId");
  const sectionId = readSetupParam(params, "sectionId");
  const teacherAllocationId = readSetupParam(params, "teacherAllocationId");
  const initialSelection = academicYearId && teacherAllocationId ? { academicYearId, teacherAllocationId } : undefined;

  return (
    <>
      <PageHeader
        title="Timetable"
        description="Plan, manage and review the school's weekly schedule."
        action={
          <AddTimetableButton
            key={initialSelection ? `${academicYearId}:${teacherAllocationId}` : undefined}
            initialSelection={initialSelection}
          />
        }
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
          <ClassTimetable
            key={`${academicYearId ?? ""}:${classId ?? ""}:${sectionId ?? ""}`}
            initialAcademicYearId={academicYearId}
            initialClassId={classId}
            initialSectionId={sectionId}
          />
        </TabsContent>

        <TabsContent value="manage" className="mt-0">
          <TimetableTable />
        </TabsContent>
      </Tabs>
    </>
  );
}
