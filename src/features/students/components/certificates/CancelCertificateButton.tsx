"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CancelCertificateButton({ id, certificateNo }: { id: string; certificateNo: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function cancel() {
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/certificate-issues/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cancellationNote: note }) });
      const payload = await response.json() as { success?: boolean; message?: string };
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to cancel certificate.");
      toast.success("Certificate cancelled. The register entry was retained.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to cancel certificate.");
    } finally {
      setSaving(false);
    }
  }

  return <><Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setOpen(true)}><Ban className="size-3.5" /> Cancel</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Cancel certificate?</DialogTitle><DialogDescription>{certificateNo} remains in the audit register but cannot be printed again.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor={`cancel-${id}`}>Cancellation reason</Label><Textarea id={`cancel-${id}`} required maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Keep certificate</Button><Button variant="destructive" disabled={saving || !note.trim()} onClick={() => void cancel()}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />}{saving ? "Cancelling..." : "Confirm cancellation"}</Button></DialogFooter></DialogContent></Dialog></>;
}
