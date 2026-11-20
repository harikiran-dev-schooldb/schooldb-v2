import { PageHeader } from "@/components/common/PageHeader";
import { readSetupParam, type SetupSearchParams } from "@/features/school-setup/setup-readiness";
import { AddTeacherAllocationButton } from "@/features/teacher-allocations/components/AddTeacherAllocationButton";
import { TeacherAllocationTable } from "@/features/teacher-allocations/components/TeacherAllocationTable";

export default async function TeacherAllocationsPage({ searchParams }: { searchParams: SetupSearchParams }) {
  const params = await searchParams;
  const academicYearId = readSetupParam(params, "academicYearId");
  const classId = readSetupParam(params, "classId");
  const sectionId = readSetupParam(params, "sectionId");
  const subjectId = readSetupParam(params, "subjectId");
  const initialSelection = academicYearId && classId && sectionId && subjectId
    ? { academicYearId, classId, sectionId, subjectId }
    : undefined;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Teacher Allocations"
        description="Manage teacher allocations and their associated academic information."
        action={
          <AddTeacherAllocationButton
            key={initialSelection ? `${academicYearId}:${classId}:${sectionId}:${subjectId}` : undefined}
            initialSelection={initialSelection}
          />
        }
      />

      <section className="premium-card overflow-hidden rounded-3xl bg-white p-3 md:p-5">
        <TeacherAllocationTable />
      </section>
    </div>
  );
}
