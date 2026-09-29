"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Copy,
  LoaderCircle,
  QrCode,
  ShieldCheck,
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
import { formatCurrency } from "@/lib/self-service-format";

export type StudentCashfreeOrder = {
  orderId: string;
  publicUrl: string;
  paymentSessionId: string;
  mode: "sandbox" | "production";
  amount: number;
};

type PaymentStatus =
  | "CREATED"
  | "ACTIVE"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "REVIEW_REQUIRED";

async function verifyOrder({
  schoolSlug,
  studentId,
  orderId,
}: {
  schoolSlug: string;
  studentId: string;
  orderId: string;
}) {
  const response = await fetch(
    `/api/v1/online-payments/cashfree/orders/${encodeURIComponent(orderId)}/verify`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolSlug, studentId }),
    },
  );
  const result = (await response.json()) as {
    success: boolean;
    message?: string;
    data?: { status: PaymentStatus; feePaymentId?: string | null };
  };
  if (!response.ok || !result.data) {
    throw new Error(result.message || "Unable to verify payment.");
  }
  return result.data;
}

export function StudentCashfreeQrDialog({
  open,
  onOpenChange,
  schoolSlug,
  studentId,
  order,
  onPaid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolSlug: string;
  studentId: string;
  order: StudentCashfreeOrder;
  onPaid: () => void;
}) {
  const [status, setStatus] = useState<PaymentStatus>("ACTIVE");
  const [checking, setChecking] = useState(false);
  const [opening, setOpening] = useState(false);
  const notifiedPaid = useRef(false);

  async function checkPayment(showError = true) {
    if (status === "PAID") return;
    if (showError) setChecking(true);
    try {
      const result = await verifyOrder({
        schoolSlug,
        studentId,
        orderId: order.orderId,
      });
      setStatus(result.status);
      if (result.status === "PAID" && !notifiedPaid.current) {
        notifiedPaid.current = true;
        toast.success("Payment verified. The student fee ledger is updated.");
        onPaid();
      }
    } catch (error) {
      if (showError) {
        toast.error(
          error instanceof Error ? error.message : "Unable to verify payment.",
        );
      }
    } finally {
      if (showError) setChecking(false);
    }
  }

  useEffect(() => {
    if (!open || status !== "ACTIVE") return;
    const timer = window.setInterval(() => {
      void checkPayment(false);
    }, 4000);
    return () => window.clearInterval(timer);
    // The active order identity and status are the polling boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order.orderId, status]);

  async function openCheckout() {
    const cashfreeFactory = (
      window as unknown as {
        Cashfree?: (options: { mode: "sandbox" | "production" }) => {
          checkout(options: {
            paymentSessionId: string;
            redirectTarget: "_self";
          }): Promise<{ error?: { message?: string } }>;
        };
      }
    ).Cashfree;
    if (!cashfreeFactory) {
      toast.error("Secure checkout is still loading. Please try again.");
      return;
    }

    setOpening(true);
    try {
      const result = await cashfreeFactory({ mode: order.mode }).checkout({
        paymentSessionId: order.paymentSessionId,
        redirectTarget: "_self",
      });
      if (result?.error) {
        throw new Error(result.error.message || "Checkout could not be opened.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Checkout could not be opened.",
      );
      setOpening(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(order.publicUrl);
    toast.success("Secure payment link copied.");
  }

  const paid = status === "PAID";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="size-5 text-indigo-600" />
            Pay fees by UPI / QR
          </DialogTitle>
          <DialogDescription>
            Scan with any UPI app. No UTR or manual verification is required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-col items-center rounded-3xl border border-indigo-100 bg-indigo-50/50 p-5 text-center">
            {paid ? (
              <span className="flex size-52 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="size-16" />
              </span>
            ) : (
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <QRCode value={order.publicUrl} size={210} level="M" />
              </div>
            )}
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">
              Amount payable
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight">
              {formatCurrency(order.amount)}
            </p>
          </div>

          {paid ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="font-semibold text-emerald-900">Payment successful</p>
              <p className="mt-1 text-sm text-emerald-800">
                The receipt and student ledger were updated automatically.
              </p>
            </div>
          ) : (
            <>
              <Button
                type="button"
                size="xl"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                onClick={() => void openCheckout()}
                disabled={opening}
              >
                {opening ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Smartphone className="size-4" />
                )}
                {opening ? "Opening checkout…" : "Pay on this device"}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => void copyLink()}>
                  <Copy className="size-4" /> Copy link
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void checkPayment()}
                  disabled={checking}
                >
                  {checking ? <LoaderCircle className="size-4 animate-spin" /> : null}
                  Check payment
                </Button>
              </div>
            </>
          )}

          <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            Cashfree confirms the payment before SchoolDB creates a receipt or changes the student ledger.
          </p>
          <p className="text-center font-mono text-[10px] text-muted-foreground">
            {order.orderId}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
