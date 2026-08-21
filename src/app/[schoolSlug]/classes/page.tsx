import { PageHeader } from "@/components/common/PageHeader";
import { AddClassButton } from "@/features/classes/components/AddClassButton";
import { ClassTable } from "@/features/classes/components/ClassTable";

export default function ClassesPage() {
  return (
    <>
      <PageHeader
        title="Classes"
        description="Create and manage the academic classes available in your school."
        action={<AddClassButton />}
      />

      <ClassTable />
    </>
  );
}
