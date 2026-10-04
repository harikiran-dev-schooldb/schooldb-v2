"use client";

import { useActionState, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { CalendarRange, Clock3, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
import { queuePwaAction } from "@/lib/pwa-storage";

import { createLeaveRequest } from "./actions";

const requestTypes = [
  { value: "LEAVE", label: "Leave", description: "One or more full days" },
  { value: "LATE_ARRIVAL", label: "Late arrival", description: "Arriving after normal reporting time" },
  { value: "EARLY_DEPARTURE", label: "Early departure", description: "Leaving school before closing time" },
  { value: "HALF_DAY", label: "Half day", description: "Attending only part of the day" },
  { value: "PERMISSION", label: "Permission", description: "Short permission during the school day" },
] as const;

type RequestType = (typeof requestTypes)[number]["value"];

export function LeaveRequestForm({ schoolSlug, studentId }: { schoolSlug: string; studentId: string }) {
  const { userId } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [offlineQueued, setOfflineQueued] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>("LEAVE");
  const [state, action, pending] = useActionState(
    createLeaveRequest.bind(null, schoolSlug, studentId),
    { error: "", success: false },
  );

  const isLeave = requestType === "LEAVE";
  const isTimed = requestType === "LATE_ARRIVAL" || requestType === "EARLY_DEPARTURE" || requestType === "PERMISSION";

  async function submitOrQueue() {
    const form = formRef.current;
    if (!form) return;
    if (navigator.onLine) {
      form.requestSubmit();
      return;
    }
    if (!userId) {
      toast.error("Reconnect to submit this request.");
      return;
    }

    const formData = new FormData(form);
    const id = crypto.randomUUID();
    await queuePwaAction({
      id,
      ownerKey: `${userId}:${schoolSlug}`,
      url: "/api/v1/pwa/leave-requests",
      method: "POST",
      createdAt: new Date().toISOString(),
      body: {
        schoolSlug,
        studentId,
        clientRequestId: id,
        requestType: String(formData.get("requestType") || "LEAVE"),
        startDate: String(formData.get("startDate") || ""),
        endDate: String(formData.get("endDate") || ""),
        startTime: String(formData.get("startTime") || ""),
        endTime: String(formData.get("endTime") || ""),
        reason: String(formData.get("reason") || ""),
      },
    });
    setConfirmationOpen(false);
    setOfflineQueued(true);
    form.reset();
    setRequestType("LEAVE");
    toast.success("Request saved. It will submit when you reconnect.");
  }

  return (
    <form ref={formRef} action={action} onSubmit={() => setConfirmationOpen(false)} className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card/95 shadow-[0_24px_70px_rgba(79,70,229,0.12)]">
      <div className="relative overflow-hidden border-b border-indigo-100 bg-gradient-to-br from-white via-indigo-50 to-violet-100 px-5 py-6 text-slate-950 sm:px-7">
        <div className="pointer-events-none absolute -right-10 -top-16 size-40 rounded-full bg-indigo-300/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 size-36 rounded-full bg-cyan-300/20 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-200 backdrop-blur-sm"><CalendarRange className="size-6" /></div>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600"><Sparkles className="size-3.5" />Quick request</div>
            <h2 className="mt-2 text-xl font-bold tracking-[-0.02em]">Leave & permission request</h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-600">Tell the school whether the student needs leave, late arrival, early departure, half day or short permission.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
        <fieldset className="sm:col-span-2">
          <legend className="mb-3 text-sm font-semibold">Request type</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {requestTypes.map((type) => (
              <label htmlFor={`leave-request-type-${type.value}`} key={type.value} className={`min-h-16 cursor-pointer rounded-2xl border p-3 transition ${requestType === type.value ? "border-indigo-400 bg-indigo-500/10 ring-2 ring-indigo-500/10" : "border-border bg-background/70 hover:border-indigo-400/50"}`}>
                <input id={`leave-request-type-${type.value}`} type="radio" name="requestType" value={type.value} checked={requestType === type.value} onChange={() => setRequestType(type.value)} className="sr-only" />
                <span className="block text-sm font-bold text-foreground">{type.label}</span>
                <span className="mt-1 block text-xs leading-4 text-muted-foreground">{type.description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label htmlFor="leave-start-date" className="grid gap-2 text-sm font-semibold">
          {isLeave ? "From" : "Date"}
          <Input id="leave-start-date" name="startDate" type="date" required className="h-12 rounded-2xl border-border bg-background/70 px-4" />
        </label>

        {isLeave ? (
          <label htmlFor="leave-end-date" className="grid gap-2 text-sm font-semibold">
            To
            <Input id="leave-end-date" name="endDate" type="date" required className="h-12 rounded-2xl border-border bg-background/70 px-4" />
          </label>
        ) : (
          <input type="hidden" name="endDate" value="" />
        )}

        {isTimed && (
          <>
            <label htmlFor="leave-start-time" className="grid gap-2 text-sm font-semibold">
              <span className="flex items-center gap-2"><Clock3 className="size-4 text-indigo-500" />{requestType === "EARLY_DEPARTURE" ? "Departure time" : requestType === "LATE_ARRIVAL" ? "Expected arrival time" : "From time"}</span>
              <Input id="leave-start-time" name="startTime" type="time" required className="h-12 rounded-2xl border-border bg-background/70 px-4" />
            </label>
            {requestType === "PERMISSION" && (
              <label htmlFor="leave-end-time" className="grid gap-2 text-sm font-semibold">
                To time
                <Input id="leave-end-time" name="endTime" type="time" required className="h-12 rounded-2xl border-border bg-background/70 px-4" />
              </label>
            )}
          </>
        )}

        <label htmlFor="leave-reason" className="grid gap-2 text-sm font-semibold sm:col-span-2">
          Reason
          <Textarea id="leave-reason" name="reason" required minLength={5} maxLength={2000} className="min-h-32 rounded-2xl border-border bg-background/70 px-4" placeholder="For example: medical appointment, family requirement…" />
        </label>

        {state.error && <p role="alert" className="text-sm font-medium text-destructive sm:col-span-2">{state.error}</p>}
        {state.success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 sm:col-span-2">Request submitted for school review.</p>}
        {offlineQueued && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 sm:col-span-2">Saved offline. SchoolDB will submit it automatically after you reconnect.</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-5 sm:col-span-2">
          <p className="text-xs leading-5 text-muted-foreground">The school will notify you after reviewing this request.</p>
          <Button type="button" size="lg" className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 shadow-[0_10px_24px_rgba(79,70,229,0.24)] hover:from-indigo-700 hover:to-violet-700" disabled={pending} onClick={() => { if (formRef.current?.reportValidity()) setConfirmationOpen(true); }}>
            <Send className="size-4" />{pending ? "Submitting…" : "Submit request"}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit this request?</AlertDialogTitle>
            <AlertDialogDescription>The school will review the request details and reason before approving or rejecting it.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button type="button" disabled={pending} onClick={() => void submitOrQueue()}>{pending ? "Submitting…" : "Submit request"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
