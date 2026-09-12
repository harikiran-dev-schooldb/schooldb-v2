"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Copy, ExternalLink, LoaderCircle, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import QRCode from "react-qr-code";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/self-service-format";

type Installment = {
  id: string;
  name: string;
  outstanding: number;
};

type GeneratedOrder = {
  orderId: string;
  publicUrl: string;
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
  const [selectedIds, setSelectedIds] = useState([initialInstallmentId]);
  const [customerPhone, setCustomerPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [order, setOrder] = useState<GeneratedOrder | null>(null);
  const notifiedPaid = useRef(false);

  const selected = installments.filter((item) => selectedIds.includes(item.id));
  const total = selected.reduce((sum, item) => sum + item.outstanding, 0);

  function toggle(id: string, checked: boolean) {
    setSelectedIds((current) =>
      checked ? [...current, id] : current.filter((item) => item !== id),
    );
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
        data?: { orderId: string; publicUrl?: string; amount: number };
      };
      if (!response.ok || !result.data?.publicUrl) {
        throw new Error(result.message || "Unable to generate payment QR.");
      }
      setOrder({
        orderId: result.data.orderId,
        publicUrl: result.data.publicUrl,
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

  if (order) {
    const paid = order.status === "PAID";
    return (
      <div className="space-y-5">
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
            {paid ? "Payment received" : "Ask the student to scan"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {paid
              ? `${formatCurrency(order.amount)} was verified and added to the fee ledger.`
              : `${studentName} can scan this QR using any phone camera.`}
          </p>
          <Badge className="mt-3" variant={paid ? "success" : "secondary"}>
            {paid ? "Receipt created" : `Waiting for ${formatCurrency(order.amount)}`}
          </Badge>
        </div>

        {!paid ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={() => void checkPayment()} disabled={checking}>
              {checking ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              {checking ? "Checking…" : "Check payment"}
            </Button>
            <Button variant="outline" onClick={() => void copyLink()}>
              <Copy className="size-4" /> Copy link
            </Button>
            <Button variant="outline" asChild>
              <a href={order.publicUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" /> Open
              </a>
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
          <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white"><QrCode className="size-5" /></span>
          <div>
            <p className="font-semibold">Generate payment QR</p>
            <p className="text-xs text-muted-foreground">The amount is recalculated securely before checkout.</p>
          </div>
        </div>
      </div>

      <div className="max-h-64 divide-y overflow-y-auto rounded-2xl border">
        {installments.map((installment) => (
          <label key={installment.id} className="flex cursor-pointer items-center gap-3 p-4 hover:bg-muted/20">
            <Checkbox
              checked={selectedIds.includes(installment.id)}
              onCheckedChange={(value) => toggle(installment.id, value === true)}
              aria-label={`Select ${installment.name}`}
            />
            <span className="min-w-0 flex-1 font-medium">{installment.name}</span>
            <span className="font-bold tabular-nums">{formatCurrency(installment.outstanding)}</span>
          </label>
        ))}
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
          <p className="text-xs font-semibold text-muted-foreground">QR payment total</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{formatCurrency(total)}</p>
        </div>
        <Button size="lg" onClick={() => void generateQr()} disabled={creating || !selectedIds.length}>
          {creating ? <LoaderCircle className="size-4 animate-spin" /> : <QrCode className="size-4" />}
          {creating ? "Generating…" : "Generate QR"}
        </Button>
      </div>
    </div>
  );
}

export function StaffCashfreeQrDialog({
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
          <DialogTitle>Cashfree payment QR</DialogTitle>
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
