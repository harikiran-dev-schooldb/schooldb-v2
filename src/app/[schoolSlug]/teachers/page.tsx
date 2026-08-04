import { PageHeader } from "@/components/common/PageHeader";

import { AddSectionButton } from "@/features/sections/components/AddSectionButton";
import { TeacherTable } from "@/features/teachers/components/TeacherTable";

export default function TeachersPage() {
  return (
    <>
      <PageHeader
        title="Teachers"
        description="Manage school teachers and their associated information ."
        action={<AddSectionButton />}
      />

      <TeacherTable />
    </>
  );
}
