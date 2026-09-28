"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Copy, CreditCard, ExternalLink, LoaderCircle, ShieldCheck, Smartphone } from "lucide-react";
import QRCode from "react-qr-code";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/self-service-format";
import { refreshTable } from "@/lib/table-event";

type Installment = {
  id: string;
  name: string;
  outstanding: number;
  studentFeeId: string;
  sequence: number;
};

type GeneratedOrder = {
  orderId: string;
  publicUrl: string;
  paymentSessionId: string;
  mode: "sandbox" | "production";
  amount: number;
  status: "ACTIVE" | "PAID" | "FAILED" | "EXPIRED" | "REVIEW_REQUIRED";
  feePaymentId?: string | null;
};

async function verifyStaffOrder(schoolSlug: string, orderId: string) {
  const response = await fetch(
    `/api/v1/online-payments/cashfree/staff/orders/${encodeURIComponent(orderId)}/verify?schoolSlug=${encodeURIComponent(schoolSlug)}`,
    { method: "POST" },
  );
  const result = (await response.json()) as {
    success: boolean;
    message?: string;
    data?: {
      status: GeneratedOrder["status"];
      feePaymentId?: string | null;
      amount: number;
    };
  };
  if (!response.ok || !result.data) throw new Error(result.message || "Unable to verify payment.");
  return result.data;
}

function StaffQrFlow({
  schoolSlug,
  studentId,
  studentName,
  installments,
  initialInstallmentId,
  onSuccess,
}: {
  schoolSlug: string;
  studentId: string;
  studentName: string;
  installments: Installment[];
  initialInstallmentId: string;
  onSuccess: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState(() => {
    const initialInstallment = installments.find(
      (item) => item.id === initialInstallmentId,
    );
    if (!initialInstallment) return [initialInstallmentId];

    return installments
      .filter(
        (item) =>
          item.studentFeeId === initialInstallment.studentFeeId &&
          item.sequence <= initialInstallment.sequence,
      )
      .map((item) => item.id);
  });
  const [customerPhone, setCustomerPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [order, setOrder] = useState<GeneratedOrder | null>(null);
  const notifiedPaid = useRef(false);

  const selected = installments.filter((item) => selectedIds.includes(item.id));
  const total = selected.reduce((sum, item) => sum + item.outstanding, 0);

  function blockingInstallment(installment: Installment) {
    return installments
      .filter(
        (candidate) =>
          candidate.studentFeeId === installment.studentFeeId &&
          candidate.sequence < installment.sequence &&
          !selectedIds.includes(candidate.id),
      )
      .sort((a, b) => a.sequence - b.sequence)[0];
  }

  function toggle(id: string, checked: boolean) {
    const installment = installments.find((item) => item.id === id);
    if (!installment) return;

    if (checked && blockingInstallment(installment)) {
      toast.error("Pay earlier installments first.");
      return;
    }

    setSelectedIds((current) => {
      if (checked) return current.includes(id) ? current : [...current, id];

      return current.filter((selectedId) => {
        const selectedInstallment = installments.find(
          (item) => item.id === selectedId,
        );
        return !(
          selectedInstallment?.studentFeeId === installment.studentFeeId &&
          selectedInstallment.sequence >= installment.sequence
        );
      });
    });
  }

  async function generateQr() {
    if (!selectedIds.length) {
      toast.error("Select at least one installment.");
      return;
    }
    if (customerPhone && !/^[6-9]\d{9}$/.test(customerPhone)) {
      toast.error("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/v1/online-payments/cashfree/staff/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolSlug,
          studentId,
          installmentIds: selectedIds,
          idempotencyKey: crypto.randomUUID(),
          ...(customerPhone ? { customerPhone } : {}),
        }),
      });
      const result = (await response.json()) as {
        success: boolean;
        message?: string;
        data?: {
          orderId: string;
          publicUrl?: string;
          paymentSessionId: string;
          mode: "sandbox" | "production";
          amount: number;
        };
      };
      if (!response.ok || !result.data?.publicUrl) {
        throw new Error(result.message || "Unable to generate payment QR.");
      }
      setOrder({
        orderId: result.data.orderId,
        publicUrl: result.data.publicUrl,
        paymentSessionId: result.data.paymentSessionId,
        mode: result.data.mode,
        amount: result.data.amount,
        status: "ACTIVE",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to generate payment QR.");
    } finally {
      setCreating(false);
    }
  }

  async function checkPayment(showLoading = true) {
    if (!order) return;
    if (showLoading) setChecking(true);
    try {
      const next = await verifyStaffOrder(schoolSlug, order.orderId);
      setOrder((current) => current ? { ...current, ...next } : current);
      if (next.status === "PAID" && !notifiedPaid.current) {
        notifiedPaid.current = true;
        toast.success("Payment verified and receipt created.");
        refreshTable("student-fees", "fee-payments", "fee-receipts");
        onSuccess();
      }
    } catch (error) {
      if (showLoading) {
        toast.error(error instanceof Error ? error.message : "Unable to verify payment.");
      }
    } finally {
      if (showLoading) setChecking(false);
    }
  }

  useEffect(() => {
    if (!order || order.status !== "ACTIVE") return;
    const timer = window.setInterval(() => { void checkPayment(false); }, 4_000);
    return () => window.clearInterval(timer);
    // Poll only while the current generated order is active.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.orderId, order?.status, schoolSlug]);

  async function copyLink() {
    if (!order) return;
    await navigator.clipboard.writeText(order.publicUrl);
    toast.success("Payment link copied.");
  }

  async function payOnOfficeDevice() {
    if (!order) return;

    const cashfreeFactory = (
      window as unknown as {
        Cashfree?: (options: {
          mode: "sandbox" | "production";
        }) => {
          checkout(options: {
            paymentSessionId: string;
            redirectTarget: "_modal";
          }): Promise<{ error?: { message?: string } }>;
        };
      }
    ).Cashfree;

    if (!cashfreeFactory) {
      toast.error("Secure checkout is still loading. Please try again.");
      return;
    }

    setOpeningCheckout(true);
    try {
      const result = await cashfreeFactory({ mode: order.mode }).checkout({
        paymentSessionId: order.paymentSessionId,
        redirectTarget: "_modal",
      });
      if (result?.error) {
        throw new Error(result.error.message || "Cashfree checkout could not be opened.");
      }
      await checkPayment();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Cashfree checkout could not be opened.",
      );
    } finally {
      setOpeningCheckout(false);
    }
  }

  if (order) {
    const paid = order.status === "PAID";
    return (
      <div className="space-y-5">
        <Script
          src="https://sdk.cashfree.com/js/v3/cashfree.js"
          strategy="afterInteractive"
          onReady={() => setSdkReady(true)}
        />
        <div className="flex flex-col items-center rounded-3xl border border-indigo-100 bg-gradient-to-b from-indigo-50/80 to-white p-6 text-center">
          {paid ? (
            <span className="flex size-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
              <CheckCircle2 className="size-8" />
            </span>
          ) : (
            <div className="rounded-2xl bg-white p-4 shadow-[0_16px_45px_rgba(30,41,59,0.12)] ring-1 ring-slate-200">
              <QRCode value={order.publicUrl} size={220} level="M" />
            </div>
          )}
          <h3 className="mt-5 text-xl font-bold tracking-tight">
            {paid ? "Payment received" : "Cashfree payment ready"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {paid
              ? `${formatCurrency(order.amount)} was verified and added to the fee ledger.`
              : `${studentName} can scan this QR, or you can open checkout on this office device.`}
          </p>
          <Badge className="mt-3" variant={paid ? "success" : "secondary"}>
            {paid ? "Receipt created" : `Waiting for ${formatCurrency(order.amount)}`}
          </Badge>
        </div>

        {!paid ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              className="sm:col-span-2"
              onClick={() => void payOnOfficeDevice()}
              disabled={!sdkReady || openingCheckout}
            >
              {openingCheckout ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <CreditCard className="size-4" />
              )}
              {openingCheckout
                ? "Opening checkout…"
                : sdkReady
                  ? "Pay on this device"
                  : "Loading secure checkout…"}
            </Button>
            <Button variant="outline" onClick={() => void checkPayment()} disabled={checking}>
              {checking ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              {checking ? "Checking…" : "Check payment"}
            </Button>
            <Button variant="outline" onClick={() => void copyLink()}>
              <Copy className="size-4" /> Copy payment link
            </Button>
          </div>
        ) : order.feePaymentId ? (
          <Button className="w-full" asChild>
            <Link href={`/${schoolSlug}/fees/receipts/${order.feePaymentId}`} target="_blank">
              View receipt <ExternalLink className="size-4" />
            </Link>
          </Button>
        ) : null}

        {order.publicUrl.includes("localhost") ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
            A physical phone cannot reach localhost. For phone testing, set NEXT_PUBLIC_BASE_URL to a public HTTPS tunnel or deployed preview.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white"><CreditCard className="size-5" /></span>
          <div>
            <p className="font-semibold">Accept an online payment</p>
            <p className="text-xs text-muted-foreground">Use Cashfree checkout on this device or let the parent scan a QR.</p>
          </div>
        </div>
      </div>

      <div className="max-h-64 divide-y overflow-y-auto rounded-2xl border">
        {installments.map((installment) => {
          const blocker = blockingInstallment(installment);
          return (
            <label
              key={installment.id}
              className={`flex items-center gap-3 p-4 ${blocker ? "cursor-not-allowed bg-muted/30" : "cursor-pointer hover:bg-muted/20"}`}
            >
              <Checkbox
                checked={selectedIds.includes(installment.id)}
                onCheckedChange={(value) => toggle(installment.id, value === true)}
                aria-label={`Select ${installment.name}`}
                disabled={Boolean(blocker)}
              />
              <span className="min-w-0 flex-1">
                <span className="font-medium">{installment.name}</span>
                {blocker ? (
                  <span className="mt-1 block text-xs font-medium text-amber-700">
                    Pay {blocker.name} first.
                  </span>
                ) : null}
              </span>
              <span className="font-bold tabular-nums">{formatCurrency(installment.outstanding)}</span>
            </label>
          );
        })}
      </div>

      <div>
        <label htmlFor="cashfree-customer-phone" className="text-sm font-semibold">Student/parent mobile</label>
        <div className="relative mt-2">
          <Smartphone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="cashfree-customer-phone"
            inputMode="numeric"
            maxLength={10}
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="Uses student record when left blank"
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Cashfree payment total</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{formatCurrency(total)}</p>
        </div>
        <Button size="lg" onClick={() => void generateQr()} disabled={creating || !selectedIds.length}>
          {creating ? <LoaderCircle className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
          {creating ? "Preparing…" : "Continue with Cashfree"}
        </Button>
      </div>
    </div>
  );
}

export function StaffCashfreePaymentDialog({
  open,
  onOpenChange,
  schoolSlug,
  student,
  installments,
  initialInstallmentId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolSlug: string;
  student: { id: string; fullName: string | null; admissionNo: string };
  installments: Installment[];
  initialInstallmentId: string;
  onSuccess: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cashfree online payment</DialogTitle>
        </DialogHeader>
        {open ? (
          <StaffQrFlow
            key={`${student.id}-${initialInstallmentId}`}
            schoolSlug={schoolSlug}
            studentId={student.id}
            studentName={student.fullName || student.admissionNo}
            installments={installments}
            initialInstallmentId={initialInstallmentId}
            onSuccess={onSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
