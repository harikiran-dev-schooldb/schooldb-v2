"use client";

import { CheckCircle2, Copy, IndianRupee, Smartphone } from "lucide-react";
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
import { formatCurrency } from "@/lib/self-service-format";
import { buildDirectUpiUri } from "../direct-upi";

export function DirectUpiDialog({
  open,
  onOpenChange,
  schoolName,
  upiId,
  payeeName,
  admissionNo,
  amount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolName: string;
  upiId: string;
  payeeName: string;
  admissionNo: string;
  amount: number;
}) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="size-5 text-emerald-600" />
            Pay directly by UPI
          </DialogTitle>
          <DialogDescription>
            This payment goes directly to {schoolName}. Cashfree is not used for this option.
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
                <p className="truncate font-mono text-sm font-semibold">{upiId}</p>
              </div>
              <Button type="button" size="icon" variant="outline" onClick={() => void copy(upiId, "UPI ID")}>
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

          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <p>
              After payment, keep the UTR / bank transaction reference. Your fee balance changes only after the school verifies the bank credit and records the payment.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
