import { AccountSettingsPage } from "@/features/settings/AccountSettingsPage";
import { PendingProfileImageApprovals } from "@/features/settings/PendingProfileImageApprovals";
import { canReviewStudentProfileImages } from "@/features/settings/profile-image-policy";
import { requireCurrentTeacher, requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function displayRole(role: string, designation: string | null) {
  if (role === "SCHOOL_ADMIN" && /principal/i.test(designation ?? "")) {
    return designation ?? "Principal";
  }
  return role
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const membership = await requireMembership(schoolSlug);
  const canApproveImages = canReviewStudentProfileImages(membership.role);
  const [teacher, pendingImageRequests] = await Promise.all([
    membership.role === "TEACHER"
      ? requireCurrentTeacher(membership.schoolId)
      : Promise.resolve(null),
    canApproveImages
      ? prisma.studentProfileImageRequest.findMany({
          where: { schoolId: membership.schoolId },
          orderBy: { createdAt: "asc" },
          include: {
            student: {
              select: { fullName: true, admissionNo: true },
            },
          },
        })
      : Promise.resolve([]),
  ]);
  const name =
    teacher?.fullName ||
    [membership.user.firstName, membership.user.lastName]
      .filter(Boolean)
      .join(" ") ||
    "SchoolDB user";
  const isPrincipal =
    membership.role === "SCHOOL_ADMIN" &&
    /principal/i.test(membership.designation ?? "");
  const canUploadImage =
    membership.role === "SUPER_ADMIN" ||
    (membership.role === "SCHOOL_ADMIN" && !isPrincipal);
  return (
    <AccountSettingsPage
      schoolSlug={schoolSlug}
      schoolName={membership.school.name}
      name={name}
      roleLabel={displayRole(membership.role, membership.designation)}
      designation={teacher?.designation ?? membership.designation}
      imageUrl={teacher?.imageUrl ?? membership.user.imageUrl}
      canUploadImage={canUploadImage}
      notificationsHref={`/${schoolSlug}/notification-inbox`}
      details={[
        ...(teacher
          ? [
              { label: "Employee ID", value: teacher.employeeId },
              { label: "Email", value: teacher.email ?? membership.user.email },
              { label: "Phone", value: teacher.phone ?? membership.user.phone ?? "" },
            ]
          : [
              { label: "Email", value: membership.user.email },
              { label: "Phone", value: membership.user.phone ?? "" },
            ]),
        { label: "School", value: membership.school.name },
      ]}
    >
      {canApproveImages ? (
        <PendingProfileImageApprovals
          schoolSlug={schoolSlug}
          requests={pendingImageRequests.map((request) => ({
            id: request.id,
            studentName:
              request.student.fullName || request.student.admissionNo,
            admissionNo: request.student.admissionNo,
            submittedAt: request.createdAt.toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Kolkata",
            }),
          }))}
        />
      ) : null}
    </AccountSettingsPage>
  );
}
