"use client";

import Script from "next/script";
import { useMemo, useState } from "react";
import { CreditCard, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatDate } from "@/lib/self-service-format";

type InstallmentOption = {
  id: string;
  name: string;
  category: string;
  dueDate: string;
  outstanding: number;
};

type CashfreeCheckout = {
  checkout(options: {
    paymentSessionId: string;
    redirectTarget: "_self";
  }): Promise<{ error?: { message?: string } }>;
};

declare global {
  interface Window {
    Cashfree?: (options: { mode: "sandbox" | "production" }) => CashfreeCheckout;
  }
}

export function OnlineFeeCheckout({
  schoolSlug,
  studentId,
  installments,
}: {
  schoolSlug: string;
  studentId: string;
  installments: InstallmentOption[];
}) {
  const [selected, setSelected] = useState(() => installments.map((item) => item.id));
  const [sdkReady, setSdkReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const total = useMemo(
    () =>
      installments
        .filter((item) => selected.includes(item.id))
        .reduce((sum, item) => sum + item.outstanding, 0),
    [installments, selected],
  );

  function toggle(id: string, checked: boolean) {
    setSelected((current) =>
      checked ? [...current, id] : current.filter((item) => item !== id),
    );
  }

  async function payNow() {
    if (!selected.length) {
      toast.error("Select at least one installment.");
      return;
    }
    if (!window.Cashfree) {
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
          paymentSessionId: string;
          mode: "sandbox" | "production";
        };
      };
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || "Unable to start checkout.");
      }

      const checkoutResult = await window
        .Cashfree({ mode: result.data.mode })
        .checkout({
          paymentSessionId: result.data.paymentSessionId,
          redirectTarget: "_self",
        });
      if (checkoutResult?.error) {
        throw new Error(checkoutResult.error.message || "Checkout could not be opened.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start checkout.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <Script
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
      />
      <Card className="overflow-hidden border-indigo-100 bg-white/95 shadow-[0_20px_60px_rgba(79,70,229,0.10)]">
        <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-5 py-5 text-white sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                <CreditCard className="size-5" />
              </span>
              <div>
                <p className="text-lg font-bold">Pay fees online</p>
                <p className="mt-0.5 text-sm text-indigo-100">Select installments and continue securely.</p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/20">
              <ShieldCheck className="size-3.5" /> Cashfree secured
            </span>
          </div>
        </div>
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="divide-y rounded-2xl border border-slate-200/80 bg-slate-50/60">
            {installments.map((installment) => {
              const checked = selected.includes(installment.id);
              return (
                <label
                  key={installment.id}
                  className="flex cursor-pointer items-start gap-3 p-4 transition-colors hover:bg-white"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => toggle(installment.id, value === true)}
                    aria-label={`Select ${installment.name}`}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-900">{installment.name}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {installment.category} · Due {formatDate(installment.dueDate)}
                    </span>
                  </span>
                  <span className="font-bold tabular-nums text-slate-900">
                    {formatCurrency(installment.outstanding)}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-indigo-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Payable now</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{formatCurrency(total)}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <LockKeyhole className="size-3.5" /> Amount is calculated from your fee ledger.
              </p>
            </div>
            <Button
              size="xl"
              onClick={payNow}
              disabled={!selected.length || !sdkReady || submitting}
              className="min-w-44 bg-indigo-600 shadow-[0_10px_26px_rgba(79,70,229,0.25)] hover:bg-indigo-700"
            >
              {submitting ? "Opening checkout…" : sdkReady ? "Pay securely" : "Loading secure checkout…"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
