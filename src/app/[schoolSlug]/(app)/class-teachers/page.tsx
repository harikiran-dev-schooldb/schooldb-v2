import { PageHeader } from "@/components/common/PageHeader";
import { ClassTeacherManager } from "@/features/class-teachers/ClassTeacherManager";
import { requireRole } from "@/lib/auth";

export default async function ClassTeachersPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Class Teachers"
        description="Assign one teacher to coordinate each class and section for an academic year."
      />
      <section className="premium-card rounded-3xl bg-white p-4 md:p-6">
        <ClassTeacherManager />
      </section>
    </div>
  );
}
