"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, LoaderCircle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/self-service-format";

type Status = "CREATED" | "ACTIVE" | "PAID" | "FAILED" | "EXPIRED" | "REVIEW_REQUIRED";

async function verify(orderId: string, token: string) {
  const response = await fetch(
    `/api/v1/public/payments/cashfree/orders/${encodeURIComponent(orderId)}/verify`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    },
  );
  const result = (await response.json()) as {
    success: boolean;
    message?: string;
    data?: { status: Status };
  };
  if (!response.ok || !result.data) {
    throw new Error(result.message || "Unable to verify this payment.");
  }
  return result.data.status;
}

export function PublicPaymentStatus({
  orderId,
  token,
  amount,
  initialStatus,
}: {
  orderId: string;
  token: string;
  amount: number;
  initialStatus: Status;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [checking, setChecking] = useState(initialStatus !== "PAID");
  const [error, setError] = useState<string | null>(null);

  async function checkAgain() {
    setChecking(true);
    setError(null);
    try {
      setStatus(await verify(orderId, token));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to verify this payment.");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (initialStatus === "PAID") return;
    let cancelled = false;
    verify(orderId, token)
      .then((nextStatus) => {
        if (!cancelled) setStatus(nextStatus);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to verify this payment.");
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => { cancelled = true; };
  }, [initialStatus, orderId, token]);

  const paid = status === "PAID";
  const review = status === "REVIEW_REQUIRED";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.12),transparent_38%),linear-gradient(to_bottom,#f8fafc,#eef2ff)] p-4">
      <Card className="w-full max-w-md overflow-hidden border-white/80 bg-white/95 shadow-[0_28px_90px_rgba(30,41,59,0.16)]">
        <div className={`h-1.5 ${paid ? "bg-emerald-500" : review ? "bg-amber-500" : "bg-indigo-500"}`} />
        <CardContent className="flex flex-col items-center p-8 text-center">
          <span className={`flex size-16 items-center justify-center rounded-3xl ${paid ? "bg-emerald-50 text-emerald-600" : review ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"}`}>
            {checking ? <LoaderCircle className="size-8 animate-spin" /> : paid ? <CheckCircle2 className="size-8" /> : <AlertTriangle className="size-8" />}
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            {checking ? "Verifying payment" : paid ? "Payment successful" : review ? "Payment under review" : "Payment not completed"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {paid
              ? `${formatCurrency(amount)} was verified and recorded. You may close this page.`
              : review
                ? "Please contact the school office. Your payment will be checked before the ledger is updated."
                : "Cashfree has not confirmed a successful payment yet."}
          </p>
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
          {!paid ? (
            <Button className="mt-6" variant="outline" onClick={() => void checkAgain()} disabled={checking}>
              <RotateCcw className="size-4" /> Check again
            </Button>
          ) : null}
          <p className="mt-6 font-mono text-[10px] text-slate-400">{orderId}</p>
        </CardContent>
      </Card>
    </main>
  );
}
