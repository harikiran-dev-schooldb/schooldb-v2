import { PageHeader } from "@/components/common/PageHeader";

import { AddSectionButton } from "@/features/sections/components/AddSectionButton";
import { SubjectTable } from "@/features/subjects/components/SubjectTable";

export default function SubjectsPage() {
  return (
    <>
      <PageHeader
        title="Subjects"
        description="Manage school subjects and their associated teachers."
        action={<AddSectionButton />}
      />

      <SubjectTable />
    </>
  );
}
