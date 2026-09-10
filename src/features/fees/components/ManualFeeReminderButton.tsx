"use client";

import { useState } from "react";
import { BellRing, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

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
import {
  previewFeeRemindersAction,
  sendFeeRemindersAction,
} from "../fee-reminder.actions";
import type {
  FeeReminderFilters,
  FeeReminderPreview,
} from "../services/fee-reminder.service";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

type Props = {
  schoolSlug: string;
  filters: FeeReminderFilters;
};

export function ManualFeeReminderButton({ schoolSlug, filters }: Props) {
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<FeeReminderPreview | null>(null);

  async function prepareReminder() {
    try {
      setPreviewing(true);
      const result = await previewFeeRemindersAction(schoolSlug, filters);
      setPreview(result);
      if (result.recipientCount === 0) {
        toast.info(
          result.recentlyRemindedCount > 0
            ? "All eligible recipients were reminded in the last 24 hours."
            : "No overdue students with WhatsApp consent and a valid number were found.",
        );
        return;
      }
      setOpen(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to prepare fee reminders.",
      );
    } finally {
      setPreviewing(false);
    }
  }

  async function sendReminder() {
    try {
      setSending(true);
      const result = await sendFeeRemindersAction(schoolSlug, filters);
      setOpen(false);
      if (result.remaining > 0) {
        toast.success(
          `${result.processed} reminders processed; ${result.remaining} remain queued in WhatsApp.`,
        );
      } else {
        toast.success(
          `Fee reminders processed for ${result.recipientCount} recipient${result.recipientCount === 1 ? "" : "s"}.`,
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to send fee reminders.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => void prepareReminder()}
        disabled={previewing || sending}
        className="h-11 rounded-xl px-5 shadow-sm"
      >
        {previewing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <BellRing className="size-4" />
        )}
        {previewing ? "Checking recipients…" : "Send fee reminders"}
      </Button>

      <AlertDialog open={open} onOpenChange={(value) => !sending && setOpen(value)}>
        <AlertDialogContent className="max-w-[460px] overflow-hidden p-0">
          <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent px-6 pb-5 pt-6">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
              <BellRing className="size-5" />
            </div>
            <AlertDialogHeader className="mt-5 gap-2 text-left">
              <AlertDialogTitle className="text-xl">
                Send overdue-fee reminders now?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm">
                  <p>
                    The current class, section and student filters will be
                    applied. Only overdue installments are included.
                  </p>
                  {preview && (
                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-background/80 p-3 text-foreground">
                      <span>{preview.recipientCount} WhatsApp recipients</span>
                      <span>{preview.installmentCount} overdue installments</span>
                      <span>{currency.format(preview.outstandingAmount)} outstanding</span>
                      <span>{preview.recentlyRemindedCount} recently skipped</span>
                    </div>
                  )}
                  <p>
                    Numbers successfully reminded within the last 24 hours are
                    skipped. The weekly Monday reminder remains enabled.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter className="bg-muted/[0.35] px-6 py-4">
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={sending}
              onClick={(event) => {
                event.preventDefault();
                void sendReminder();
              }}
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {sending ? "Sending…" : "Send reminders"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
