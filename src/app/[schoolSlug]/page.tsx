import { redirect } from "next/navigation";

import { isOperationalRole, isSelfServiceRole } from "@/lib/access-control";
import { requireMembership } from "@/lib/auth";

export default async function SchoolEntryPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const membership = await requireMembership(schoolSlug);

  if (isSelfServiceRole(membership.role)) {
    redirect(`/${schoolSlug}/my`);
  }

  if (isOperationalRole(membership.role)) {
    redirect(`/${schoolSlug}/dashboard`);
  }

  redirect("/");
}
