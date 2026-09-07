"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { processWhatsappCampaign } from "./actions";

export function SendCampaignButton({ schoolSlug, campaignId }: { schoolSlug: string; campaignId: string }) {
  const [pending, setPending] = useState(false);
  return <Button size="sm" disabled={pending} onClick={async () => { try { setPending(true); await processWhatsappCampaign(schoolSlug, campaignId); toast.success("Delivery batch processed"); } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to process campaign"); } finally { setPending(false); } }}>{pending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}{pending ? "Sending…" : "Send next batch"}</Button>;
}
