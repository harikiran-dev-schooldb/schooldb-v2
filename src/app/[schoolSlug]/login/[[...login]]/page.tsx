import { PremiumSignIn } from "@/features/auth/components/PremiumSignIn";

type Props = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

export default async function TenantLoginPage({ params }: Props) {
  const { schoolSlug } = await params;

  return <PremiumSignIn schoolSlug={schoolSlug} />;
}
