import { PageHeader } from "@/components/common/PageHeader";

import { AddSectionButton } from "@/features/sections/components/AddSectionButton";
import { SectionTable } from "@/features/sections/components/SectionTable";
import { readSetupParam, type SetupSearchParams } from "@/features/school-setup/setup-readiness";

export default async function SectionsPage({ searchParams }: { searchParams: SetupSearchParams }) {
  const classId = readSetupParam(await searchParams, "classId");

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Sections"
        description="Create and organize sections for each academic class."
        action={<AddSectionButton key={classId} initialClassId={classId} />}
      />

      <section className="premium-card overflow-hidden rounded-3xl bg-white p-3 md:p-5">
        <SectionTable />
      </section>
    </div>
  );
}
