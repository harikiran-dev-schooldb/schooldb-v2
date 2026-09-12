"use client";

import Script from "next/script";
import { useState } from "react";
import { CreditCard, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/self-service-format";

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

export function PublicCashfreeCheckout({
  schoolName,
  amount,
  paymentSessionId,
  mode,
  orderId,
}: {
  schoolName: string;
  amount: number;
  paymentSessionId: string;
  mode: "sandbox" | "production";
  orderId: string;
}) {
  const [sdkReady, setSdkReady] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openCheckout() {
    if (!window.Cashfree) return;
    setOpening(true);
    setError(null);
    const result = await window.Cashfree({ mode }).checkout({
      paymentSessionId,
      redirectTarget: "_self",
    });
    if (result?.error) {
      setError(result.error.message || "Unable to open secure checkout.");
      setOpening(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.14),transparent_38%),linear-gradient(to_bottom,#f8fafc,#eef2ff)] p-4">
      <Script
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
      />
      <Card className="w-full max-w-md overflow-hidden border-white/80 bg-white/95 shadow-[0_28px_90px_rgba(30,41,59,0.16)]">
        <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 px-6 py-7 text-white">
          <div className="flex items-center justify-between gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <CreditCard className="size-6" />
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/20">
              <ShieldCheck className="size-3.5" /> Secure payment
            </span>
          </div>
          <p className="mt-6 text-sm text-indigo-100">Fee payment for</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight">{schoolName}</h1>
        </div>
        <CardContent className="p-6">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Amount payable</p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-slate-950">{formatCurrency(amount)}</p>
          </div>
          <Button
            size="xl"
            className="mt-6 w-full bg-indigo-600 shadow-[0_12px_28px_rgba(79,70,229,0.24)] hover:bg-indigo-700"
            disabled={!sdkReady || opening}
            onClick={() => void openCheckout()}
          >
            {opening ? (
              <><LoaderCircle className="size-4 animate-spin" /> Opening checkout…</>
            ) : sdkReady ? (
              <><LockKeyhole className="size-4" /> Pay securely</>
            ) : (
              <><LoaderCircle className="size-4 animate-spin" /> Loading secure checkout…</>
            )}
          </Button>
          {error ? <p className="mt-4 text-center text-sm text-destructive">{error}</p> : null}
          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            Your payment is processed by Cashfree. SchoolDB records a receipt only after the payment is verified.
          </p>
          <p className="mt-3 text-center font-mono text-[10px] text-slate-400">{orderId}</p>
        </CardContent>
      </Card>
    </main>
  );
}
