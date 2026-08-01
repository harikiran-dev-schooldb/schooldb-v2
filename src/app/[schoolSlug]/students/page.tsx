import { PageHeader } from "@/components/common/PageHeader";
import { AddStudentButton } from "@/features/students/components/AddStudentButton";
import { StudentTable } from "@/features/students/components/StudentTable";

export default function StudentPage() {
  return (
    <>
      <PageHeader
        title="Students"
        description="Manage all students"
        action={<AddStudentButton />}
      />

      <StudentTable />
    </>
  );
}
