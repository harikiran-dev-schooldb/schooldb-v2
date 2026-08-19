import { PageHeader } from "@/components/common/PageHeader";
import { TeacherAllocationTable } from "@/features/teacher-allocations/components/TeacherAllocationTable";

export default function TeacherAllocationsPage() {
  return (
    <>
      <PageHeader
        title="Teacher Allocations"
        description="Manage teacher allocations and their associated information ."
      />

      <TeacherAllocationTable />
    </>
  );
}
