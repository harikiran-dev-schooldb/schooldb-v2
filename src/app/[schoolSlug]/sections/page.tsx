import { PageHeader } from "@/components/common/PageHeader";

import { AddSectionButton } from "@/features/sections/components/AddSectionButton";
import { SectionTable } from "@/features/sections/components/SectionTable";

export default function SectionsPage() {
  return (
    <>
      <PageHeader
        title="Sections"
        description="Manage school sections"
        action={<AddSectionButton />}
      />

      <SectionTable />
    </>
  );
}
