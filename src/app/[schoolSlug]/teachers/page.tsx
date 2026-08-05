import { PageHeader } from "@/components/common/PageHeader";

import { AddTeacherButton } from "@/features/teachers/components/AddTeacherButton";
import { TeacherTable } from "@/features/teachers/components/TeacherTable";

export default function TeachersPage() {
  return (
    <>
      <PageHeader
        title="Teachers"
        description="Manage school teachers and their associated information ."
        action={<AddTeacherButton />}
      />

      <TeacherTable />
    </>
  );
}
