"use client";

import { useActionState, useRef, useState } from "react";

import { AudienceSelector } from "@/features/audiences/AudienceSelector";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { createCalendarEvent } from "./actions";

const field = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm";

export function CalendarEventForm({ schoolSlug, academicYearId }: { schoolSlug: string; academicYearId: string | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(createCalendarEvent.bind(null, schoolSlug), { error: "", success: false });
  const [audienceReady, setAudienceReady] = useState(true);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  return (
    <form ref={formRef} action={action} className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-bold">Add calendar event</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">Event title
          <Input name="title" required minLength={3} maxLength={160} placeholder="Annual sports day" />
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">Description (optional)
          <textarea name="description" maxLength={5000} rows={3} className={field} placeholder="Add details families should know…" />
        </label>
        <label className="grid gap-2 text-sm font-medium">Event type
          <select name="category" className={field}>
            <option value="EVENT">School event</option>
            <option value="HOLIDAY">Holiday</option>
            <option value="EXAM">Exam</option>
            <option value="FEE_DEADLINE">Fee deadline</option>
            <option value="PARENT_MEETING">Parent meeting</option>
          </select>
        </label>
        <AudienceSelector academicYearId={academicYearId} onReadyChange={(ready) => setAudienceReady(ready)} />
        <label className="grid gap-2 text-sm font-medium">Start date
          <Input type="date" name="startDate" required />
        </label>
        <label className="grid gap-2 text-sm font-medium">End date
          <Input type="date" name="endDate" required />
        </label>
      </div>
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      {state.success && <p role="status" className="text-sm text-emerald-700">Calendar event published successfully.</p>}
      <Button type="button" disabled={pending || !audienceReady} onClick={() => { if (formRef.current?.reportValidity()) setConfirmationOpen(true); }}>
        {pending ? "Publishing…" : "Publish calendar event"}
      </Button>
      {!audienceReady && <p className="text-xs text-muted-foreground">Select the event audience to continue.</p>}
      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish this calendar event?</AlertDialogTitle>
            <AlertDialogDescription>It will become visible in the calendar for the selected students and parents.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => formRef.current?.requestSubmit()}>Publish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
