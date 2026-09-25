import { PageHeader } from "@/components/common/PageHeader";
import { AddSubjectButton } from "@/features/subjects/components/AddSubjectButton";
import { SubjectTable } from "@/features/subjects/components/SubjectTable";

export default function SubjectsPage() {
  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Subjects"
        description="Manage school subjects and their associated teachers."
        action={<AddSubjectButton />}
      />

      <section className="premium-card overflow-hidden rounded-3xl bg-white p-3 md:p-5">
        <SubjectTable />
      </section>
    </div>
  );
}
