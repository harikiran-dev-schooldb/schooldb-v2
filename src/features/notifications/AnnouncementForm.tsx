"use client";

import { useActionState, useRef, useState } from "react";

import { AudienceSelector } from "@/features/audiences/AudienceSelector";
import type { AudienceType } from "@/features/audiences/types";
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

import { publishAnnouncement } from "./actions";

const field =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm";

export function AnnouncementForm({
  schoolSlug,
  academicYearId,
}: {
  schoolSlug: string;
  academicYearId: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    publishAnnouncement.bind(null, schoolSlug),
    { error: "", success: false },
  );
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [target, setTarget] = useState<AudienceType>("SCHOOL");
  const [audienceReady, setAudienceReady] = useState(true);

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm"
    >
      <h2 className="text-lg font-bold">Create announcement</h2>

      <label className="grid gap-2 text-sm font-medium">
        Title
        <Input
          name="title"
          required
          minLength={3}
          maxLength={160}
          placeholder="What should families know?"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium">
        Message
        <textarea
          name="body"
          required
          minLength={3}
          maxLength={10000}
          rows={5}
          className={field}
          placeholder="Write your announcement…"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Category
          <select name="category" className={field}>
            {["GENERAL", "FEES", "EXAM", "HOMEWORK", "ATTENDANCE", "EMERGENCY"].map(
              (value) => <option key={value}>{value}</option>,
            )}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Priority
          <select name="priority" className={field}>
            {["NORMAL", "IMPORTANT", "URGENT"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>

        <AudienceSelector
          academicYearId={academicYearId}
          onReadyChange={(ready, nextTarget) => {
            setAudienceReady(ready);
            setTarget(nextTarget);
          }}
        />

        <label className="grid gap-2 text-sm font-medium">
          Publish at (optional)
          <input
            type="datetime-local"
            className={field}
            onChange={(event) => {
              const hidden = event.currentTarget.form?.elements.namedItem(
                "publishedAt",
              ) as HTMLInputElement;
              hidden.value = event.target.value
                ? new Date(event.target.value).toISOString()
                : "";
            }}
          />
          <input type="hidden" name="publishedAt" defaultValue="" />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Expires at (optional)
          <input
            type="datetime-local"
            className={field}
            onChange={(event) => {
              const hidden = event.currentTarget.form?.elements.namedItem(
                "expiresAt",
              ) as HTMLInputElement;
              hidden.value = event.target.value
                ? new Date(event.target.value).toISOString()
                : "";
            }}
          />
          <input type="hidden" name="expiresAt" defaultValue="" />
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        Times use your device’s timezone. Leave publication empty to publish
        immediately. Notices appear in the student and parent inbox.
      </p>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-emerald-700">
          Announcement saved. It will appear for its audience at the publication
          time.
        </p>
      )}

      <Button
        type="button"
        disabled={pending || !audienceReady}
        onClick={() => {
          if (formRef.current?.reportValidity()) setConfirmationOpen(true);
        }}
      >
        {pending ? "Saving…" : "Publish / schedule announcement"}
      </Button>
      {!audienceReady && (
        <p className="text-xs text-muted-foreground">
          Select the announcement audience to continue.
        </p>
      )}

      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish this announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be sent to{" "}
              {target === "SCHOOL" ? "the whole school" : "the selected audience"}
              {" "}at the chosen publication time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => formRef.current?.requestSubmit()}>
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
