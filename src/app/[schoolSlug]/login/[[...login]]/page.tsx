import { notFound } from "next/navigation";

import { TenantOtpSignIn } from "@/features/auth/components/TenantOtpSignIn";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

export default async function TenantLoginPage({ params }: Props) {
  const { schoolSlug } = await params;
  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { name: true },
  });
  if (!school) notFound();

  return <TenantOtpSignIn schoolSlug={schoolSlug} schoolName={school.name} />;
}
