import { redirect } from "next/navigation";

import { isSelfServiceRole } from "@/lib/access-control";
import { requireMembership } from "@/lib/auth";

export default async function OpenNotificationPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{ announcementId?: string }>;
}) {
  const [{ schoolSlug }, query] = await Promise.all([params, searchParams]);
  const membership = await requireMembership(schoolSlug);
  const suffix = query.announcementId
    ? `?announcementId=${encodeURIComponent(query.announcementId)}#announcement-${encodeURIComponent(query.announcementId)}`
    : "";
  redirect(
    isSelfServiceRole(membership.role)
      ? `/${schoolSlug}/my/notifications${suffix}`
      : `/${schoolSlug}/notification-inbox${suffix}`,
  );
}
