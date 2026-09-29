import { notFound } from "next/navigation";

import { TenantOtpSignIn } from "@/features/auth/components/TenantOtpSignIn";
import { prisma } from "@/lib/prisma";
import { publicSchoolLogoUrl } from "@/lib/school-branding";

type Props = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

export default async function TenantLoginPage({ params }: Props) {
  const { schoolSlug } = await params;
  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { name: true, logo: true, updatedAt: true },
  });
  if (!school) notFound();

  return (
    <TenantOtpSignIn
      schoolSlug={schoolSlug}
      schoolName={school.name}
      schoolLogo={publicSchoolLogoUrl(schoolSlug, school.logo, school.updatedAt)}
    />
  );
}
