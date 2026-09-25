import { CircleDollarSign } from "lucide-react";

import { OutstandingFeesContainer } from "@/features/student-fees/components/OutstandingFeesContainer";
import { requireTenant } from "@/lib/auth";

type Props = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

export default async function OutstandingFeesPage({ params }: Props) {
  const { schoolSlug } = await params;
  const membership = await requireTenant(schoolSlug);
  const canSendReminders = [
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "ACCOUNTANT",
  ].includes(membership.role);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10">
          <CircleDollarSign className="size-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Outstanding Fees</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review pending installments, collect payments, and follow up on dues.
          </p>
        </div>
      </div>

      <OutstandingFeesContainer
        schoolSlug={schoolSlug}
        canSendReminders={canSendReminders}
      />
    </div>
  );
}
