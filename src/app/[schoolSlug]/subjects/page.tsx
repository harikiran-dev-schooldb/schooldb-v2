import { PageHeader } from "@/components/common/PageHeader";
import { AddSubjectButton } from "@/features/subjects/components/AddSubjectButton";
import { SubjectTable } from "@/features/subjects/components/SubjectTable";

export default function SubjectsPage() {
  return (
    <>
      <PageHeader
        title="Subjects"
        description="Manage school subjects and their associated teachers."
        action={<AddSubjectButton />}
      />

      <SubjectTable />
    </>
  );
}
