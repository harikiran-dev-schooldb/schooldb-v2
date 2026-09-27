import { AccountSettingsPage } from "@/features/settings/AccountSettingsPage";
import { prisma } from "@/lib/prisma";
import { listAccessibleStudents } from "@/lib/student-access";

export default async function SelfServiceSettingsPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const { membership, students } = await listAccessibleStudents(schoolSlug);
  const student = membership.role === "STUDENT" ? students[0] : null;
  const pendingImageRequest = student
    ? await prisma.studentProfileImageRequest.findUnique({
        where: { studentId: student.id },
        select: { id: true },
      })
    : null;
  const enrollment = student?.enrollments[0] ?? null;
  const name =
    student?.fullName ||
    [membership.user.firstName, membership.user.lastName]
      .filter(Boolean)
      .join(" ") ||
    (membership.role === "PARENT" ? "Parent account" : "Student");

  return (
    <AccountSettingsPage
      schoolSlug={schoolSlug}
      schoolName={membership.school.name}
      name={name}
      roleLabel={membership.role === "PARENT" ? "Parent" : "Student"}
      imageUrl={student?.imageUrl ?? membership.user.imageUrl}
      canUploadImage={membership.role === "STUDENT"}
      imageApprovalRequired={membership.role === "STUDENT"}
      hasPendingImageRequest={Boolean(pendingImageRequest)}
      notificationsHref={`/${schoolSlug}/my/notifications`}
      details={[
        ...(student
          ? [
              { label: "Admission number", value: student.admissionNo },
              {
                label: "Class & section",
                value: enrollment
                  ? `${enrollment.class.name} · ${enrollment.section.name}`
                  : "Not currently enrolled",
              },
            ]
          : []),
        { label: "Email", value: membership.user.email },
        { label: "Phone", value: membership.user.phone ?? "" },
        { label: "School", value: membership.school.name },
      ]}
    />
  );
}
