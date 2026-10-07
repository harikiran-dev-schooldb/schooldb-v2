import { RoleUserGuide } from "@/features/user-guide/RoleUserGuide";
import { requireMembership } from "@/lib/auth";

export default async function SelfServiceUserGuidePage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const membership = await requireMembership(schoolSlug);

  return (
    <RoleUserGuide
      currentRole={membership.role}
      backHref={`/${schoolSlug}/my`}
    />
  );
}
