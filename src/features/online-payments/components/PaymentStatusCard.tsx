"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, LoaderCircle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/self-service-format";

type PaymentStatus = "CREATED" | "ACTIVE" | "PAID" | "FAILED" | "EXPIRED" | "REVIEW_REQUIRED";

async function requestVerification({
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
    data?: { status: PaymentStatus };
  };
  if (!response.ok || !result.data) {
    throw new Error(result.message || "Unable to verify payment.");
  }
  return result.data.status;
}

export function PaymentStatusCard({
  schoolSlug,
  studentId,
  orderId,
  amount,
  initialStatus,
}: {
  schoolSlug: string;
  studentId: string;
  orderId: string;
  amount: number;
  initialStatus: PaymentStatus;
}) {
  const [status, setStatus] = useState<PaymentStatus>(initialStatus);
  const [checking, setChecking] = useState(initialStatus !== "PAID");
  const [message, setMessage] = useState<string | null>(null);

  async function verify() {
    setChecking(true);
    setMessage(null);
    try {
      setStatus(await requestVerification({ schoolSlug, studentId, orderId }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to verify payment.");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (initialStatus === "PAID") return;

    let cancelled = false;
    requestVerification({ schoolSlug, studentId, orderId })
      .then((nextStatus) => {
        if (!cancelled) setStatus(nextStatus);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Unable to verify payment.");
        }
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialStatus, orderId, schoolSlug, studentId]);

  const paid = status === "PAID";
  const review = status === "REVIEW_REQUIRED";
  const pending = status === "ACTIVE" || status === "CREATED";

  return (
    <Card className="mx-auto max-w-xl overflow-hidden border-white/80 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <div className={`h-1.5 ${paid ? "bg-emerald-500" : review ? "bg-amber-500" : "bg-indigo-500"}`} />
      <CardContent className="flex flex-col items-center px-6 py-10 text-center sm:px-10">
        <span className={`flex size-16 items-center justify-center rounded-3xl ${paid ? "bg-emerald-50 text-emerald-600" : review ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"}`}>
          {checking ? (
            <LoaderCircle className="size-8 animate-spin" />
          ) : paid ? (
            <CheckCircle2 className="size-8" />
          ) : (
            <AlertTriangle className="size-8" />
          )}
        </span>
        <h2 className="mt-5 text-2xl font-bold tracking-tight">
          {checking
            ? "Verifying payment"
            : paid
              ? "Payment successful"
              : review
                ? "Payment under review"
                : pending
                  ? "Payment is processing"
                  : "Payment not completed"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {paid
            ? `${formatCurrency(amount)} has been added to the fee ledger and a receipt was created.`
            : review
              ? "The school office will verify this transaction before updating the fee ledger."
              : "We have not received a confirmed payment from Cashfree yet."}
        </p>
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500">{orderId}</p>
        {message ? <p className="mt-4 text-sm text-destructive">{message}</p> : null}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          {!paid ? (
            <Button variant="outline" onClick={verify} disabled={checking}>
              <RotateCcw className="size-4" /> Check again
            </Button>
          ) : null}
          <Button asChild>
            <Link href={`/${schoolSlug}/my/${studentId}/fees`}>Back to fees</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
