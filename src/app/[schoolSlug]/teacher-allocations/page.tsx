import { PageHeader } from "@/components/common/PageHeader";
import { AddTeacherAllocationButton } from "@/features/teacher-allocations/components/AddTeacherAllocationButton";
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
