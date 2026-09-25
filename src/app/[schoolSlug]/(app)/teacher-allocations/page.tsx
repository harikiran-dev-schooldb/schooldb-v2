import { PageHeader } from "@/components/common/PageHeader";
import { AddTeacherAllocationButton } from "@/features/teacher-allocations/components/AddTeacherAllocationButton";
import { TeacherAllocationTable } from "@/features/teacher-allocations/components/TeacherAllocationTable";

export default function TeacherAllocationsPage() {
  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Teacher Allocations"
        description="Manage teacher allocations and their associated academic information."
        action={<AddTeacherAllocationButton />}
      />

      <section className="premium-card overflow-hidden rounded-3xl bg-white p-3 md:p-5">
        <TeacherAllocationTable />
      </section>
    </div>
  );
}
