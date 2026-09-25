import { PageHeader } from "@/components/common/PageHeader";
import { AddStudentEnrollmentButton } from "@/features/student-enrollments/components/AddStudentEnrollmentButton";
import { StudentEnrollmentTable } from "@/features/student-enrollments/components/StudentEnrollmentTable";

export default function EnrollmentsPage() {
  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Student Enrollments"
        description="Assign students to an academic year, class, and section."
        action={<AddStudentEnrollmentButton />}
      />

      <section className="premium-card overflow-hidden rounded-3xl bg-white p-3 md:p-5">\n        <StudentEnrollmentTable />\n      </section>
    </div>
  );
}
