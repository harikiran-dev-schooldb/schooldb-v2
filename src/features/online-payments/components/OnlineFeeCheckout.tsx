"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CreditCard, LockKeyhole, QrCode, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatDate } from "@/lib/self-service-format";
import {
  StudentCashfreeQrDialog,
  type StudentCashfreeOrder,
} from "./StudentCashfreeQrDialog";

type InstallmentOption = {
  id: string;
  name: string;
  category: string;
  dueDate: string;
  outstanding: number;
  studentFeeId: string;
  sequence: number;
};

export function OnlineFeeCheckout({
  schoolSlug,
  studentId,
  installments,
  cashfreeAvailable,
}: {
  schoolSlug: string;
  studentId: string;
  installments: InstallmentOption[];
  cashfreeAvailable: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(() => installments.map((item) => item.id));
  const [submitting, setSubmitting] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [order, setOrder] = useState<StudentCashfreeOrder | null>(null);
  const total = useMemo(
    () =>
      installments
        .filter((item) => selected.includes(item.id))
        .reduce((sum, item) => sum + item.outstanding, 0),
    [installments, selected],
  );

  function blockingInstallment(installment: InstallmentOption) {
    return installments
      .filter(
        (candidate) =>
          candidate.studentFeeId === installment.studentFeeId &&
          candidate.sequence < installment.sequence &&
          !selected.includes(candidate.id),
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

    setSelected((current) => {
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

  async function payWithCashfree() {
    if (order) {
      setPaymentOpen(true);
      return;
    }
    if (!selected.length) {
      toast.error("Select at least one installment.");
      return;
    }
    if (!cashfreeAvailable) {
      toast.error("Secure checkout is still loading. Please try again.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/online-payments/cashfree/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolSlug,
          studentId,
          installmentIds: selected,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const result = (await response.json()) as {
        success: boolean;
        message?: string;
        data?: {
          orderId: string;
          publicUrl: string;
          paymentSessionId: string;
          mode: "sandbox" | "production";
          amount: number;
        };
      };
      if (!response.ok || !result.success || !result.data?.publicUrl) {
        throw new Error(result.message || "Unable to start checkout.");
      }
      setOrder(result.data);
      setPaymentOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start checkout.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {cashfreeAvailable ? (
        <Script
          src="https://sdk.cashfree.com/js/v3/cashfree.js"
          strategy="afterInteractive"
        />
      ) : null}
      <Card className="overflow-hidden border-indigo-100 bg-white/95 shadow-[0_20px_60px_rgba(79,70,229,0.10)]">
        <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-5 py-5 text-white sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                <CreditCard className="size-5" />
              </span>
              <div>
                <p className="text-lg font-bold">Pay fees online</p>
                <p className="mt-0.5 text-sm text-indigo-100">Select installments, scan the QR, and pay with any supported UPI app.</p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/20">
              <ShieldCheck className="size-3.5" /> School payment options
            </span>
          </div>
        </div>
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="divide-y rounded-2xl border border-slate-200/80 bg-slate-50/60">
            {installments.map((installment) => {
              const checked = selected.includes(installment.id);
              const blocker = blockingInstallment(installment);
              return (
                <label
                  key={installment.id}
                  className={`flex items-start gap-3 p-4 transition-colors ${blocker ? "cursor-not-allowed bg-slate-100/70" : "cursor-pointer hover:bg-white"}`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => toggle(installment.id, value === true)}
                    aria-label={`Select ${installment.name}`}
                    disabled={Boolean(blocker)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-semibold text-slate-900">
                      {installment.name}
                      {blocker ? (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                          Locked
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {installment.category} · Due {formatDate(installment.dueDate)}
                    </span>
                    {blocker ? (
                      <span className="mt-1 block text-xs font-medium text-amber-700">
                        Pay {blocker.name} first.
                      </span>
                    ) : null}
                  </span>
                  <span className="font-bold tabular-nums text-slate-900">
                    {formatCurrency(installment.outstanding)}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-indigo-50/70 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Payable now</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{formatCurrency(total)}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <LockKeyhole className="size-3.5" /> Amount is calculated from your fee ledger.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {cashfreeAvailable ? (
                <Button
                  size="xl"
                  onClick={() => void payWithCashfree()}
                  disabled={!selected.length || total <= 0 || submitting}
                  className="min-w-44 bg-indigo-600 shadow-[0_10px_26px_rgba(79,70,229,0.25)] hover:bg-indigo-700"
                >
                  <QrCode className="size-4" />
                  {submitting ? "Creating secure QR…" : "Pay with UPI / QR"}
                </Button>
              ) : null}
            </div>
          </div>

          <p className="text-xs leading-5 text-muted-foreground">
            No UTR is required. Cashfree verifies the payment and SchoolDB updates the receipt and fee ledger automatically.
          </p>
        </CardContent>
      </Card>

      {order ? (
        <StudentCashfreeQrDialog
          key={order.orderId}
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          schoolSlug={schoolSlug}
          studentId={studentId}
          order={order}
          onPaid={() => {
            setPaymentOpen(false);
            setOrder(null);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
