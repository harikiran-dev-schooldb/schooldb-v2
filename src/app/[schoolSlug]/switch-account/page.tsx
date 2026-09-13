import { AccountSwitcher } from "@/features/auth/components/AccountSwitcher";
import { requireMembership } from "@/lib/auth";

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
    />
  );
}
