"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckCircle2,
  Copy,
  IndianRupee,
  LoaderCircle,
  Smartphone,
} from "lucide-react";
import QRCode from "react-qr-code";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/self-service-format";
import {
  buildDirectUpiUri,
  isValidUpiReference,
  normalizeUpiReference,
} from "../direct-upi";

export function DirectUpiDialog({
  open,
  onOpenChange,
  schoolSlug,
  schoolName,
  studentId,
  installmentIds,
  upiId,
  payeeName,
  admissionNo,
  amount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolSlug: string;
  schoolName: string;
  studentId: string;
  installmentIds: string[];
  upiId: string;
  payeeName: string;
  admissionNo: string;
  amount: number;
}) {
  const router = useRouter();
  const [utr, setUtr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const paymentUri = buildDirectUpiUri({
    upiId,
    payeeName,
    amount,
    note: `School fee - ${admissionNo}`,
  });

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied.`);
  }

  async function submitForVerification() {
    const normalizedUtr = normalizeUpiReference(utr);
    if (!isValidUpiReference(normalizedUtr)) {
      toast.error("Enter a valid UPI UTR / transaction reference.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/direct-upi/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolSlug,
          studentId,
          installmentIds,
          utr: normalizedUtr,
        }),
      });
      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };
      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to submit payment for verification.",
        );
      }

      toast.success("Payment submitted for school verification.");
      setUtr("");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to submit payment for verification.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="size-5 text-emerald-600" />
            Pay directly by UPI
          </DialogTitle>
          <DialogDescription>
            This payment goes directly to {schoolName}. Cashfree is not used
            for this option.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="mx-auto w-fit rounded-3xl border bg-white p-4 shadow-sm">
            <QRCode value={paymentUri} size={210} />
          </div>

          <div className="rounded-2xl border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Amount
            </p>
            <p className="mt-1 flex items-center gap-1 text-2xl font-bold tracking-tight">
              <IndianRupee className="size-5" />
              {formatCurrency(amount).replace(/^₹\s?/, "")}
            </p>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-background p-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">School UPI ID</p>
                <p className="truncate font-mono text-sm font-semibold">
                  {upiId}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => void copy(upiId, "UPI ID")}
              >
                <Copy className="size-4" />
                <span className="sr-only">Copy UPI ID</span>
              </Button>
            </div>
          </div>

          <Button asChild size="xl" className="w-full">
            <a href={paymentUri}>
              <Smartphone className="size-4" />
              Open UPI app
            </a>
          </Button>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-emerald-950">
                  Already completed the payment?
                </p>
                <p className="mt-1 text-sm leading-5 text-emerald-900/80">
                  Enter the UTR / transaction reference shown in your UPI app.
                  The school will verify the bank credit before your fee is
                  marked paid.
                </p>
                <Input
                  value={utr}
                  onChange={(event) => setUtr(event.target.value)}
                  placeholder="UPI UTR / transaction ID"
                  autoComplete="off"
                  className="mt-3 bg-white"
                  maxLength={80}
                />
                <Button
                  type="button"
                  className="mt-3 w-full bg-emerald-700 hover:bg-emerald-800"
                  onClick={() => void submitForVerification()}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      Submit for verification
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <p className="text-xs leading-5 text-muted-foreground">
            Do not submit a UTR until the UPI app shows the payment as
            successful. Submitting a UTR does not automatically mark the fee as
            paid.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
