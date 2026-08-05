import { PageHeader } from "@/components/common/PageHeader";
import { AcademicYearTable } from "@/features/academic-years/components/AcademicYearTable";
import { AddClassButton } from "@/features/classes/components/AddClassButton";
import { ClassTable } from "@/features/classes/components/ClassTable";

export default function AcademicYearPage() {
  return (
    <>
      <PageHeader
        title="Academic Year"
        description="Manage academic year settings and configurations for the school.s"
        action={<AddClassButton />}
      />

      <AcademicYearTable />
    </>
  );
}
