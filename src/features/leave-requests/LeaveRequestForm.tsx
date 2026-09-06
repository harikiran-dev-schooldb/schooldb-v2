"use client";

import { useActionState, useRef, useState } from "react";
import { CalendarRange, Send, Sparkles } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { createLeaveRequest } from "./actions";

export function LeaveRequestForm({ schoolSlug, studentId }: { schoolSlug: string; studentId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [state, action, pending] = useActionState(
    createLeaveRequest.bind(null, schoolSlug, studentId),
    { error: "", success: false },
  );

  return (
    <form ref={formRef} action={action} onSubmit={() => setConfirmationOpen(false)} className="relative overflow-hidden rounded-[28px] border border-indigo-200/70 bg-white/95 shadow-[0_24px_70px_rgba(79,70,229,0.12)]">
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600 px-5 py-6 text-white sm:px-7">
        <div className="pointer-events-none absolute -right-10 -top-16 size-40 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 size-36 rounded-full bg-cyan-300/20 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
            <CalendarRange className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-100"><Sparkles className="size-3.5" />Quick request</div>
            <h2 className="mt-2 text-xl font-bold tracking-[-0.02em]">Request student leave</h2>
            <p className="mt-1.5 text-sm leading-6 text-indigo-100">Choose the absence dates and share a clear reason with the school.</p>
          </div>
        </div>
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
        <label className="grid gap-2 text-sm font-semibold">
          From
          <Input name="startDate" type="date" required className="h-12 rounded-2xl border-slate-200 bg-slate-50/80 px-4 shadow-inner shadow-slate-100 focus:bg-white" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          To
          <Input name="endDate" type="date" required className="h-12 rounded-2xl border-slate-200 bg-slate-50/80 px-4 shadow-inner shadow-slate-100 focus:bg-white" />
        </label>
        <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
          Reason
          <Textarea name="reason" required minLength={5} maxLength={2000} className="min-h-32 rounded-2xl border-slate-200 bg-slate-50/80 px-4 shadow-inner shadow-slate-100 focus:bg-white" placeholder="For example: family function, medical appointment…" />
        </label>
        {state.error && <p role="alert" className="text-sm font-medium text-destructive sm:col-span-2">{state.error}</p>}
        {state.success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 sm:col-span-2">Leave request submitted for review.</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 sm:col-span-2">
          <p className="text-xs leading-5 text-muted-foreground">The school will notify you after reviewing this request.</p>
          <Button type="button" size="lg" className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 shadow-[0_10px_24px_rgba(79,70,229,0.24)] hover:from-indigo-700 hover:to-violet-700" disabled={pending} onClick={() => { if (formRef.current?.reportValidity()) setConfirmationOpen(true); }}>
            <Send className="size-4" />{pending ? "Submitting…" : "Submit request"}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit this leave request?</AlertDialogTitle>
            <AlertDialogDescription>The school will review the dates and reason before approving or rejecting it.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button type="button" disabled={pending} onClick={() => formRef.current?.requestSubmit()}>
              {pending ? "Submitting…" : "Submit request"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
