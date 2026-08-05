import { PageHeader } from "@/components/common/PageHeader";
import { AcademicYearTable } from "@/features/academic-years/components/AcademicYearTable";
import { AddAcademicYearButton } from "@/features/academic-years/components/AddAcademicYearButton";

export default function AcademicYearPage() {
  return (
    <>
      <PageHeader
        title="Academic Year"
        description="Manage academic year settings and configurations for the school.s"
        action={<AddAcademicYearButton />}
      />

      <AcademicYearTable />
    </>
  );
}
