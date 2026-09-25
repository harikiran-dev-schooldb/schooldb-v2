import { PageHeader } from "@/components/common/PageHeader";

import { AddSectionButton } from "@/features/sections/components/AddSectionButton";
import { SectionTable } from "@/features/sections/components/SectionTable";

export default function SectionsPage() {
  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Sections"
        description="Create and organize sections for each academic class."
        action={<AddSectionButton />}
      />

      <section className="premium-card overflow-hidden rounded-3xl bg-white p-3 md:p-5">
        <SectionTable />
      </section>
    </div>
  );
}
