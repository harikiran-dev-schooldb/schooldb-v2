import { AccountSwitcher } from "@/features/auth/components/AccountSwitcher";
import { requireMembership } from "@/lib/auth";
import { publicSchoolLogoUrl } from "@/lib/school-branding";

export default async function SwitchAccountPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const membership = await requireMembership(schoolSlug);
  return (
    <AccountSwitcher
      schoolSlug={schoolSlug}
      schoolName={membership.school.name}
      schoolLogo={publicSchoolLogoUrl(
        schoolSlug,
        membership.school.logo,
        membership.school.updatedAt,
      )}
    />
  );
}
