import { PageHeader } from "@/components/common/PageHeader";
import { AddClassButton } from "@/features/classes/components/AddClassButton";
import { ClassTable } from "@/features/classes/components/ClassTable";

export default function ClassesPage() {
  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Classes"
        description="Create and manage the academic classes available in your school."
        action={<AddClassButton />}
      />

      <section className="premium-card overflow-hidden rounded-3xl bg-white p-3 md:p-5">
        <ClassTable />
      </section>
    </div>
  );
}
