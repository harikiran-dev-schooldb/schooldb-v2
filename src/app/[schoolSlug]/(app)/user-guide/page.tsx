import { RoleUserGuide } from "@/features/user-guide/RoleUserGuide";
import { requireMembership } from "@/lib/auth";

export default async function StaffUserGuidePage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const membership = await requireMembership(schoolSlug);
  const backHref = membership.role === "TEACHER"
    ? `/${schoolSlug}/teacher/dashboard`
    : `/${schoolSlug}/dashboard`;

  return (
    <RoleUserGuide
      currentRole={membership.role}
      backHref={backHref}
    />
  );
}
