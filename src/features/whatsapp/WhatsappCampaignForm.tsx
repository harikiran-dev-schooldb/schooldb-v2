"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  CheckCircle2,
  Clock3,
  Loader2,
  MessageCircleMore,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { getWhatsappRecipientPreview, queueWhatsappCampaign } from "./actions";

export function WhatsappCampaignForm({
  schoolSlug,
  academicYearId,
}: {
  schoolSlug: string;
  academicYearId: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action, pending] = useActionState(
    queueWhatsappCampaign.bind(null, schoolSlug),
    {
      error: "",
      success: "",
    },
  );

  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const [target, setTarget] = useState<AudienceType>("SCHOOL");

  const [targetId, setTargetId] = useState("");

  const [audienceReady, setAudienceReady] = useState(true);

  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  const [optedInCount, setOptedInCount] = useState<number | null>(null);

  const [loadingRecipients, setLoadingRecipients] = useState(false);

  const [recipientError, setRecipientError] = useState("");

  useEffect(() => {
    if (!audienceReady) return;

    let cancelled = false;

    async function loadRecipients() {
      try {
        const result = await getWhatsappRecipientPreview(
          schoolSlug,
          target,
          targetId,
        );

        if (cancelled) return;

        setOptedInCount(result.optedInStudents);
        setRecipientCount(result.eligibleRecipients);
      } catch (error) {
        if (cancelled) return;

        setOptedInCount(null);
        setRecipientCount(null);

        setRecipientError(
          error instanceof Error
            ? error.message
            : "Unable to check WhatsApp recipients.",
        );
      } finally {
        if (!cancelled) {
          setLoadingRecipients(false);
        }
      }
    }

    void loadRecipients();

    return () => {
      cancelled = true;
    };
  }, [schoolSlug, target, targetId, audienceReady]);

  const canQueue =
    audienceReady &&
    !loadingRecipients &&
    recipientCount !== null &&
    recipientCount > 0;

  return (
    <form
      ref={formRef}
      action={action}
      className="overflow-hidden rounded-[24px] border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
    >
      <div className="border-b bg-gradient-to-br from-emerald-500/[0.10] via-card to-teal-500/[0.08] p-6">
        <div className="flex gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
            <MessageCircleMore className="size-6" />
          </div>

          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Create WhatsApp campaign
            </h2>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Send one approved template message to the selected student
              audience.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="wa-title">Message title</Label>

            <Input
              id="wa-title"
              name="title"
              required
              minLength={3}
              maxLength={120}
              placeholder="e.g. School closed tomorrow"
            />
          </div>

          <AudienceSelector
            academicYearId={academicYearId}
            onReadyChange={(ready, nextTarget, nextTargetId) => {
              setAudienceReady(ready);
              setTarget(nextTarget);
              setTargetId(nextTargetId ?? "");
            }}
          />
        </div>

        {/* Recipient preview */}
        <div className="rounded-2xl border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              {loadingRecipients ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Users className="size-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {loadingRecipients
                  ? "Checking WhatsApp recipients…"
                  : recipientCount !== null
                    ? `${recipientCount.toLocaleString()} eligible WhatsApp recipient${
                        recipientCount === 1 ? "" : "s"
                      }`
                    : "WhatsApp recipients"}
              </p>

              {!loadingRecipients && optedInCount !== null && (
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {optedInCount.toLocaleString()} active student
                  {optedInCount === 1 ? "" : "s"} opted in. Invalid mobile
                  numbers and duplicate family numbers are excluded.
                </p>
              )}

              {!loadingRecipients && recipientCount === 0 && (
                <p className="mt-1 text-xs font-medium text-destructive">
                  No opted-in student with a valid WhatsApp mobile number was
                  found for this audience.
                </p>
              )}

              {recipientError && (
                <p className="mt-1 text-xs font-medium text-destructive">
                  {recipientError}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wa-message">Message</Label>

          <Textarea
            id="wa-message"
            name="message"
            rows={5}
            required
            minLength={3}
            maxLength={900}
            placeholder="e.g. The school will remain closed tomorrow."
          />

          <p className="text-xs text-muted-foreground">
            Type only the announcement details here. Meta adds the fixed “School
            update” and school-office text automatically.
          </p>
        </div>

        <div className="grid gap-2 sm:max-w-md">
          <Label htmlFor="wa-schedule">Schedule (optional)</Label>

          <div className="relative">
            <Clock3 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              id="wa-schedule"
              type="datetime-local"
              className="pl-10"
              onChange={(event) => {
                const hidden = event.currentTarget.form?.elements.namedItem(
                  "scheduledAt",
                ) as HTMLInputElement;

                hidden.value = event.target.value
                  ? new Date(event.target.value).toISOString()
                  : "";
              }}
            />
          </div>

          <input type="hidden" name="scheduledAt" defaultValue="" />
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-900">
          <ShieldCheck className="mt-0.5 size-5 shrink-0" />

          <div>
            <p className="text-sm font-semibold">Safe queued delivery</p>

            <p className="mt-1 text-xs leading-5 text-emerald-800/80">
              Only students who opted in to WhatsApp are included. Duplicate
              family numbers are removed. Messages remain queued until an
              administrator starts delivery.
            </p>
          </div>
        </div>

        {state.error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {state.error}
          </p>
        )}

        {state.success && (
          <p role="status" className="text-sm font-medium text-emerald-700">
            {state.success}
          </p>
        )}

        <Button
          type="button"
          disabled={pending || !canQueue}
          onClick={() => {
            if (formRef.current?.reportValidity()) {
              setConfirmationOpen(true);
            }
          }}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}

          {pending ? "Queueing…" : "Review & queue campaign"}
        </Button>
      </div>

      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Queue this WhatsApp campaign?</AlertDialogTitle>

            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  The campaign will prepare{" "}
                  <span className="font-semibold text-foreground">
                    {recipientCount?.toLocaleString() ?? "0"} eligible WhatsApp
                    recipient
                    {recipientCount === 1 ? "" : "s"}
                  </span>{" "}
                  from{" "}
                  {target === "SCHOOL"
                    ? "the whole school"
                    : "the selected audience"}
                  .
                </p>

                {optedInCount !== null && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-emerald-800">
                    <CheckCircle2 className="size-4 shrink-0" />

                    <span className="text-sm">
                      {optedInCount.toLocaleString()} active student
                      {optedInCount === 1 ? "" : "s"} opted in to WhatsApp.
                    </span>
                  </div>
                )}

                <p>
                  Duplicate family numbers and invalid mobile numbers are
                  excluded. No message is sent until you start delivery from the
                  campaign list.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>

            <AlertDialogAction
              disabled={!canQueue || pending}
              onClick={() => formRef.current?.requestSubmit()}
            >
              Queue {recipientCount?.toLocaleString() ?? ""}
              {recipientCount === 1 ? " recipient" : " recipients"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
