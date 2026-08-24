import { PageHeader } from "@/components/common/PageHeader";
import { AddStudentEnrollmentButton } from "@/features/student-enrollments/components/AddStudentEnrollmentButton";
import { StudentEnrollmentTable } from "@/features/student-enrollments/components/StudentEnrollmentTable";

export default function EnrollmentsPage() {
  return (
    <>
      <PageHeader
        title="Student Enrollments"
        description="Assign students to an academic year, class, and section"
        action={<AddStudentEnrollmentButton />}
      />

      <StudentEnrollmentTable />
    </>
  );
}
