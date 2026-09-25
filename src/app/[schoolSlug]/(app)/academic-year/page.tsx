import { PageHeader } from "@/components/common/PageHeader";
import { AcademicYearTable } from "@/features/academic-years/components/AcademicYearTable";
import { AddAcademicYearButton } from "@/features/academic-years/components/AddAcademicYearButton";

export default function AcademicYearPage() {
  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Academic Year"
        title="Academic Year"
        description="Manage academic year settings and configurations for the school."
        action={<AddAcademicYearButton />}
      />

      <section className="premium-card overflow-hidden rounded-3xl bg-white p-3 md:p-5">
        <AcademicYearTable />
      </section>
    </div>
  );
}
