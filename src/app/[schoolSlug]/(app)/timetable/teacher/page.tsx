import { PageHeader } from "@/components/common/PageHeader";
import { TeacherTimetableContainer } from "@/features/timetable";
import {
  requireCurrentTeacher,
  requireTeacherFeatureAccess,
  requireTenant,
} from "@/lib/auth";

type Props = {
  params: Promise<{ schoolSlug: string }>;
};

export default async function TeacherTimetablePage({ params }: Props) {
  const { schoolSlug } = await params;
  const membership = await requireTenant(schoolSlug);
  const currentTeacher =
    membership.role === "TEACHER"
      ? await requireTeacherFeatureAccess("TIMETABLE", schoolSlug).then(() =>
          requireCurrentTeacher(membership.schoolId),
        )
      : undefined;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Teacher Timetable"
        description={
          currentTeacher
            ? "View your weekly teaching schedule, subjects, classes, and sections."
            : "View the weekly teaching schedule, subjects, classes, and sections assigned to a teacher."
        }
      />

      <section className="premium-card overflow-hidden rounded-3xl bg-white p-3 md:p-5">
        <TeacherTimetableContainer
          currentTeacher={
            currentTeacher
              ? { id: currentTeacher.id, fullName: currentTeacher.fullName }
              : undefined
          }
        />
      </section>
    </div>
  );
}
