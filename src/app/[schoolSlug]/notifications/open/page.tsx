import { redirect } from "next/navigation";

import { isSelfServiceRole } from "@/lib/access-control";
import { requireMembership } from "@/lib/auth";

export default async function OpenNotificationPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const membership = await requireMembership(schoolSlug);
  redirect(
    isSelfServiceRole(membership.role)
      ? `/${schoolSlug}/my/notifications`
      : `/${schoolSlug}/notification-inbox`,
  );
}
