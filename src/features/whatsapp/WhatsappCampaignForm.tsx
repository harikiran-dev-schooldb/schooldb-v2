"use client";

import { useActionState, useRef, useState } from "react";
import { Clock3, MessageCircleMore, Send, ShieldCheck } from "lucide-react";

import { AudienceSelector } from "@/features/audiences/AudienceSelector";
import type { AudienceType } from "@/features/audiences/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { queueWhatsappCampaign } from "./actions";

export function WhatsappCampaignForm({ schoolSlug, academicYearId }: { schoolSlug: string; academicYearId: string | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(queueWhatsappCampaign.bind(null, schoolSlug), { error: "", success: "" });
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [target, setTarget] = useState<AudienceType>("SCHOOL");
  const [audienceReady, setAudienceReady] = useState(true);

  return (
    <form ref={formRef} action={action} className="overflow-hidden rounded-[24px] border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className="border-b bg-gradient-to-br from-emerald-500/[0.10] via-card to-teal-500/[0.08] p-6">
        <div className="flex gap-4"><div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"><MessageCircleMore className="size-6" /></div><div><h2 className="text-xl font-bold tracking-tight">Create WhatsApp campaign</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Send one approved template message to the selected student audience.</p></div></div>
      </div>
      <div className="space-y-5 p-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="wa-title">Message title</Label><Input id="wa-title" name="title" required minLength={3} maxLength={120} placeholder="e.g. School closed tomorrow" /></div>
          <AudienceSelector academicYearId={academicYearId} onReadyChange={(ready, nextTarget) => { setAudienceReady(ready); setTarget(nextTarget); }} />
        </div>
        <div className="space-y-2"><Label htmlFor="wa-message">Message</Label><Textarea id="wa-message" name="message" rows={5} required minLength={3} maxLength={900} placeholder="e.g. The school will remain closed tomorrow." /><p className="text-xs text-muted-foreground">Type only the announcement details here. Meta adds the fixed “School update” and school-office text automatically.</p></div>
        <div className="grid gap-2 sm:max-w-md"><Label htmlFor="wa-schedule">Schedule (optional)</Label><div className="relative"><Clock3 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="wa-schedule" type="datetime-local" className="pl-10" onChange={(event) => { const hidden = event.currentTarget.form?.elements.namedItem("scheduledAt") as HTMLInputElement; hidden.value = event.target.value ? new Date(event.target.value).toISOString() : ""; }} /></div><input type="hidden" name="scheduledAt" defaultValue="" /></div>
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-900"><ShieldCheck className="mt-0.5 size-5 shrink-0" /><div><p className="text-sm font-semibold">Safe queued delivery</p><p className="mt-1 text-xs leading-5 text-emerald-800/80">Duplicate family numbers are removed. Messages remain queued until an administrator starts delivery.</p></div></div>
        {state.error && <p role="alert" className="text-sm font-medium text-destructive">{state.error}</p>}
        {state.success && <p role="status" className="text-sm font-medium text-emerald-700">{state.success}</p>}
        <Button type="button" disabled={pending || !audienceReady} onClick={() => { if (formRef.current?.reportValidity()) setConfirmationOpen(true); }}><Send className="size-4" />{pending ? "Queueing…" : "Review & queue campaign"}</Button>
      </div>
      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Queue this WhatsApp campaign?</AlertDialogTitle><AlertDialogDescription>The campaign will prepare recipients for {target === "SCHOOL" ? "the whole school" : "the selected audience"}. No message is sent until you start delivery from the campaign list.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => formRef.current?.requestSubmit()}>Queue campaign</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </form>
  );
}
