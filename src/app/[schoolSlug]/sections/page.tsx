import { PageHeader } from "@/components/common/PageHeader";

import { AddSectionButton } from "@/features/sections/components/AddSectionButton";
import { SectionTable } from "@/features/sections/components/SectionTable";

export default function SectionsPage() {
  return (
    <>
      <PageHeader
        title="Sections"
        description="Create and organize sections for each academic class."
        action={<AddSectionButton />}
      />

      <SectionTable />
    </>
  );
}
