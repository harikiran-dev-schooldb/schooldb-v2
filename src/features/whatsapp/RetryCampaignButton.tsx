"use client";

import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { retryFailedWhatsappCampaign } from "./actions";

export function RetryCampaignButton({
  schoolSlug,
  campaignId,
  failedCount,
}: {
  schoolSlug: string;
  campaignId: string;
  failedCount: number;
}) {
  const [pending, setPending] = useState(false);

  async function retry() {
    try {
      setPending(true);
      await retryFailedWhatsappCampaign(schoolSlug, campaignId);
      toast.success("Failed messages retried");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to retry messages",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <ConfirmDialog
      title="Retry failed WhatsApp messages?"
      description={`This will immediately try sending ${failedCount} failed message${failedCount === 1 ? "" : "s"} again. Successful recipients will not receive a duplicate.`}
      confirmLabel="Retry failed"
      onConfirm={() => void retry()}
      trigger={
        <Button size="sm" variant="outline" disabled={pending}>
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RotateCcw className="size-3.5" />
          )}
          {pending ? "Retrying…" : "Retry failed"}
        </Button>
      }
    />
  );
}
