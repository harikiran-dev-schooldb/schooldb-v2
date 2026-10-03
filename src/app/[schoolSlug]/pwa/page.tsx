import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageContainer, PageHeader } from "@/components/common/layout";
import { PwaControlCenter } from "@/components/pwa/PwaControlCenter";
import { Button } from "@/components/ui/button";
import { isSelfServiceRole } from "@/lib/access-control";
import { requireMembership } from "@/lib/auth";

export default async function PwaSettingsPage({ params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const membership = await requireMembership(schoolSlug);
  const backHref = isSelfServiceRole(membership.role) ? `/${schoolSlug}/my` : `/${schoolSlug}/dashboard`;

  return (
    <PageContainer>
      <div className="mb-3">
        <Button asChild variant="ghost" size="sm"><Link href={backHref}><ArrowLeft className="size-4" /> Back</Link></Button>
      </div>
      <PageHeader
        title="PWA & device settings"
        description="Notifications, offline access, updates, passkeys, sharing, and device diagnostics."
      />
      <PwaControlCenter schoolSlug={schoolSlug} />
    </PageContainer>
  );
}
