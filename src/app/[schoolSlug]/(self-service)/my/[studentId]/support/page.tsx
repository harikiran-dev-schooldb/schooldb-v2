import { SelfServicePage } from "@/components/self-service/SelfServicePage";
import { StudentSupportClient } from "@/components/self-service/StudentSupportClient";
import { requireStudentAccess } from "@/lib/student-access";

export default async function StudentSupportPage({
  params,
}: {
  params: Promise<{ schoolSlug: string; studentId: string }>;
}) {
  const { schoolSlug, studentId } = await params;
  const { student } = await requireStudentAccess(schoolSlug, studentId);

  return (
    <SelfServicePage
      title="Support"
      description="Send queries or concerns to the school and track their resolution."
    >
      <StudentSupportClient
        schoolSlug={schoolSlug}
        studentId={studentId}
        studentName={student.fullName || "your student"}
      />
    </SelfServicePage>
  );
}
