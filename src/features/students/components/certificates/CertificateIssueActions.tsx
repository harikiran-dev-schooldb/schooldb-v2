"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FileCheck2, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = { studentId: string; type: "BONAFIDE" | "STUDY" | "TRANSFER"; issueId?: string; cancelled?: boolean };

export function CertificateIssueActions({ studentId, type, issueId, cancelled = false }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [saving, setSaving] = useState(false);

  async function issue() {
    setSaving(true);
    try {
      const response = await fetch("/api/v1/certificate-issues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId, type, purpose }) });
      const payload = await response.json() as { success?: boolean; message?: string; data?: { id: string } };
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.message || "Unable to issue certificate.");
      toast.success("Certificate issued and added to the register.");
      setOpen(false);
      router.replace(`${pathname}?issueId=${payload.data.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to issue certificate.");
    } finally {
      setSaving(false);
    }
  }

  async function print() {
    if (!issueId) return;
    const response = await fetch(`/api/v1/certificate-issues/${issueId}`, { method: "POST" });
    if (!response.ok) {
      const payload = await response.json() as { message?: string };
      toast.error(payload.message || "Unable to record this print.");
      return;
    }
    window.print();
  }

  if (issueId && !cancelled) return <Button onClick={() => void print()}><Printer className="size-4" /> Print / save PDF</Button>;

  return (
    <>
      <Button onClick={() => setOpen(true)}><FileCheck2 className="size-4" /> {cancelled ? "Issue new certificate" : "Issue certificate"}</Button>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Issue this certificate?</DialogTitle><DialogDescription>This creates a permanent certificate number and adds the document to the official issue register.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="certificate-purpose">Purpose (optional)</Label><Textarea id="certificate-purpose" maxLength={300} value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="Scholarship, bank account, passport, transfer…" /></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={saving} onClick={() => void issue()}>{saving ? <Loader2 className="size-4 animate-spin" /> : <FileCheck2 className="size-4" />}{saving ? "Issuing..." : "Confirm issue"}</Button></DialogFooter></DialogContent></Dialog>
    </>
  );
}
