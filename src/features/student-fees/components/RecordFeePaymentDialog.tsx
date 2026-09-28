"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  CalendarDays,
  CheckCircle2,
  Copy,
  CreditCard,
  IndianRupee,
  Landmark,
  LoaderCircle,
  QrCode,
  ReceiptIndianRupee,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import QRCode from "react-qr-code";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";
import { refreshTable } from "@/lib/table-event";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Installment = {
  id: string;

  name: string;

  payableAmount: number;

  paidAmount: number;

  outstanding: number;

  sequence?: number;

  dueDate?: string;

  feePlanId?: string;

  feePlanName?: string;

  feeCategoryName?: string;

  status?: "PENDING" | "PARTIAL" | "PAID" | "WAIVED";
};

type Props = {
  open: boolean;

  onOpenChange: (open: boolean) => void;

  schoolSlug?: string;

  studentEnrollmentId: string;

  installments: Installment[];

  onSuccess: () => void;
};

type PaymentFormProps = {
  schoolSlug?: string;

  studentEnrollmentId: string;

  installments: Installment[];

  onOpenChange: (open: boolean) => void;

  onSuccess: () => void;
};

type CashfreeOrder = {
  orderId: string;
  publicUrl: string;
  paymentSessionId: string;
  mode: "sandbox" | "production";
  amount: number;
  status: "ACTIVE" | "PAID" | "FAILED" | "EXPIRED" | "REVIEW_REQUIRED";
  feePaymentId?: string | null;
};

async function verifyCashfreeOrder(schoolSlug: string, orderId: string) {
  const response = await fetch(
    `/api/v1/online-payments/cashfree/staff/orders/${encodeURIComponent(orderId)}/verify?schoolSlug=${encodeURIComponent(schoolSlug)}`,
    { method: "POST" },
  );
  const result = (await response.json()) as {
    success: boolean;
    message?: string;
    data?: Pick<CashfreeOrder, "status" | "feePaymentId" | "amount">;
  };
  if (!response.ok || !result.data) {
    throw new Error(result.message || "Unable to verify Cashfree payment.");
  }
  return result.data;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function money(value: number) {
  return `₹${Math.max(0, value).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string) {
  if (!value) return null;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getPlanKey(installment: Installment) {
  if (installment.feePlanId) return `id:${installment.feePlanId}`;
  if (installment.feePlanName) return `name:${installment.feePlanName}`;
  return "default";
}

function getSamePlanInstallments(
  installments: Installment[],
  target: Installment,
) {
  const planKey = getPlanKey(target);

  return installments.filter(
    (installment) => getPlanKey(installment) === planKey,
  );
}

function getEarlierInstallments(
  installments: Installment[],
  target: Installment,
) {
  const samePlanInstallments = getSamePlanInstallments(installments, target);

  if (typeof target.sequence === "number") {
    return samePlanInstallments.filter(
      (installment) =>
        typeof installment.sequence === "number" &&
        installment.sequence < target.sequence!,
    );
  }

  const targetIndex = samePlanInstallments.findIndex(
    (installment) => installment.id === target.id,
  );

  return targetIndex > 0 ? samePlanInstallments.slice(0, targetIndex) : [];
}

function getLaterInstallments(
  installments: Installment[],
  target: Installment,
) {
  const samePlanInstallments = getSamePlanInstallments(installments, target);

  if (typeof target.sequence === "number") {
    return samePlanInstallments.filter(
      (installment) =>
        typeof installment.sequence === "number" &&
        installment.sequence > target.sequence!,
    );
  }

  const targetIndex = samePlanInstallments.findIndex(
    (installment) => installment.id === target.id,
  );

  return targetIndex >= 0 ? samePlanInstallments.slice(targetIndex + 1) : [];
}

/* -------------------------------------------------------------------------- */
/* Payment Form                                                               */
/* -------------------------------------------------------------------------- */

function PaymentForm({
  schoolSlug,
  studentEnrollmentId,
  installments,
  onOpenChange,
  onSuccess,
}: PaymentFormProps) {
  /* ------------------------------------------------------------------------ */
  /* Sort installments                                                        */
  /* ------------------------------------------------------------------------ */

  const sortedInstallments = useMemo(() => {
    return [...installments].sort((a, b) => {
      /*
       * First sort by fee plan.
       *
       * This keeps each fee plan grouped together.
       */
      const planA = a.feePlanName ?? "";
      const planB = b.feePlanName ?? "";

      const planCompare = planA.localeCompare(planB);

      if (planCompare !== 0) {
        return planCompare;
      }

      /*
       * Then sort by installment sequence.
       */
      return (a.sequence ?? 0) - (b.sequence ?? 0);
    });
  }, [installments]);

  /* ------------------------------------------------------------------------ */
  /* Initial selection                                                        */
  /* ------------------------------------------------------------------------ */

  const firstInstallment = sortedInstallments[0];

  const [selectedInstallmentIds, setSelectedInstallmentIds] = useState<
    string[]
  >(() => (firstInstallment ? [firstInstallment.id] : []));

  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, number>>(
    () =>
      firstInstallment
        ? {
            [firstInstallment.id]: firstInstallment.outstanding,
          }
        : {},
  );

  const [paymentMode, setPaymentMode] = useState("CASH");

  const [paymentDate, setPaymentDate] = useState(getToday);

  const [referenceNo, setReferenceNo] = useState("");

  const [remarks, setRemarks] = useState("");

  const [loading, setLoading] = useState(false);

  const [customerPhone, setCustomerPhone] = useState("");

  const [cashfreeOrder, setCashfreeOrder] = useState<CashfreeOrder | null>(
    null,
  );

  const [checkingCashfree, setCheckingCashfree] = useState(false);

  const [openingCashfree, setOpeningCashfree] = useState(false);

  const [cashfreeSdkReady, setCashfreeSdkReady] = useState(false);

  const notifiedCashfreePaid = useRef(false);

  /* ------------------------------------------------------------------------ */
  /* Selected installments                                                    */
  /* ------------------------------------------------------------------------ */

  const selectedInstallments = useMemo(() => {
    return sortedInstallments.filter((installment) =>
      selectedInstallmentIds.includes(installment.id),
    );
  }, [selectedInstallmentIds, sortedInstallments]);

  /* ------------------------------------------------------------------------ */
  /* Total outstanding                                                        */
  /* ------------------------------------------------------------------------ */

  const selectedOutstanding = useMemo(() => {
    return selectedInstallments.reduce(
      (sum, installment) => sum + installment.outstanding,
      0,
    );
  }, [selectedInstallments]);

  /* ------------------------------------------------------------------------ */
  /* Total payment                                                            */
  /* ------------------------------------------------------------------------ */

  const totalPayment = useMemo(() => {
    return selectedInstallments.reduce(
      (sum, installment) => sum + (paymentAmounts[installment.id] ?? 0),
      0,
    );
  }, [paymentAmounts, selectedInstallments]);

  /* ------------------------------------------------------------------------ */
  /* Fee plan groups                                                           */
  /* ------------------------------------------------------------------------ */

  const selectedPlanCount = useMemo(() => {
    return new Set(
      selectedInstallments.map(
        (installment) => installment.feePlanId ?? installment.feePlanName,
      ),
    ).size;
  }, [selectedInstallments]);

  function getBlockingInstallment(installment: Installment) {
    return getEarlierInstallments(sortedInstallments, installment).find(
      (earlierInstallment) => {
        if (earlierInstallment.status === "WAIVED") return false;

        const allocatedAmount = selectedInstallmentIds.includes(
          earlierInstallment.id,
        )
          ? (paymentAmounts[earlierInstallment.id] ?? 0)
          : 0;

        return earlierInstallment.outstanding - allocatedAmount > 0.005;
      },
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Toggle installment                                                       */
  /* ------------------------------------------------------------------------ */

  function toggleInstallment(installmentId: string) {
    const clickedIndex = sortedInstallments.findIndex(
      (item) => item.id === installmentId,
    );

    if (clickedIndex === -1) return;

    const clickedInstallment = sortedInstallments[clickedIndex];

    const currentlySelected = selectedInstallmentIds.includes(installmentId);

    /* ---------------------------------------------------------------------- */
    /* Remove                                                                 */
    /* ---------------------------------------------------------------------- */

    if (currentlySelected) {
      const removedIds = new Set([
        installmentId,
        ...getLaterInstallments(sortedInstallments, clickedInstallment).map(
          (installment) => installment.id,
        ),
      ]);

      setSelectedInstallmentIds((current) =>
        current.filter((id) => !removedIds.has(id)),
      );

      setPaymentAmounts((current) => {
        const next = { ...current };

        removedIds.forEach((id) => delete next[id]);

        return next;
      });

      return;
    }

    /* ---------------------------------------------------------------------- */
    /* Add                                                                     */
    /* ---------------------------------------------------------------------- */

    /*
     * IMPORTANT:
     *
     * We no longer force one global sequence across different fee plans.
     *
     * Example:
     *
     * Tuition:
     *   Term 1
     *   Term 2
     *
     * Transport:
     *   Term 1
     *   Term 2
     *
     * The cashier can select:
     *
     * Tuition Term 1
     * Tuition Term 2
     * Transport Term 1
     * Transport Term 2
     *
     * independently.
     *
     * We only allow a later installment after every earlier installment of
     * the SAME fee plan is already paid or will be paid in full in this
     * receipt.
     */

    const blockingInstallment = getBlockingInstallment(clickedInstallment);

    if (blockingInstallment) {
      toast.error(
        `Pay ${blockingInstallment.name} in full before selecting ${clickedInstallment.name}.`,
      );

      return;
    }

    setSelectedInstallmentIds((current) => [...current, installmentId]);

    setPaymentAmounts((current) => ({
      ...current,
      [installmentId]: clickedInstallment.outstanding,
    }));
  }

  /* ------------------------------------------------------------------------ */
  /* Update amount                                                            */
  /* ------------------------------------------------------------------------ */

  function updatePaymentAmount(installment: Installment, value: string) {
    if (paymentMode === "ONLINE") return;

    let amount = value === "" ? 0 : Number(value);

    if (!Number.isFinite(amount)) {
      amount = 0;
    }

    amount = Math.max(0, amount);

    if (amount > installment.outstanding) {
      amount = installment.outstanding;
    }

    const laterIds = new Set(
      getLaterInstallments(sortedInstallments, installment).map(
        (laterInstallment) => laterInstallment.id,
      ),
    );
    const mustRemoveLaterInstallments =
      installment.outstanding - amount > 0.005;

    if (mustRemoveLaterInstallments) {
      setSelectedInstallmentIds((current) =>
        current.filter((id) => !laterIds.has(id)),
      );
    }

    setPaymentAmounts((current) => {
      const next = {
        ...current,
        [installment.id]: amount,
      };

      if (mustRemoveLaterInstallments) {
        laterIds.forEach((id) => delete next[id]);
      }

      return next;
    });
  }

  /* ------------------------------------------------------------------------ */
  /* Select all                                                               */
  /* ------------------------------------------------------------------------ */

  function selectAllOutstanding() {
    const ids = sortedInstallments.map((installment) => installment.id);

    const amounts: Record<string, number> = {};

    sortedInstallments.forEach((installment) => {
      amounts[installment.id] = installment.outstanding;
    });

    setSelectedInstallmentIds(ids);

    setPaymentAmounts(amounts);
  }

  /* ------------------------------------------------------------------------ */
  /* Clear all                                                                */
  /* ------------------------------------------------------------------------ */

  function clearSelection() {
    setSelectedInstallmentIds([]);

    setPaymentAmounts({});
  }

  function changePaymentMode(value: string) {
    setPaymentMode(value);

    if (value === "ONLINE") {
      setPaymentAmounts(
        Object.fromEntries(
          selectedInstallments.map((installment) => [
            installment.id,
            installment.outstanding,
          ]),
        ),
      );
      setReferenceNo("");
    }
  }

  async function checkCashfreePayment(showToast = true) {
    if (!cashfreeOrder || !schoolSlug) return;
    if (showToast) setCheckingCashfree(true);

    try {
      const next = await verifyCashfreeOrder(schoolSlug, cashfreeOrder.orderId);
      setCashfreeOrder((current) =>
        current ? { ...current, ...next } : current,
      );

      if (next.status === "PAID" && !notifiedCashfreePaid.current) {
        notifiedCashfreePaid.current = true;
        toast.success("Payment verified and receipt created.");
        refreshTable("student-fees", "fee-payments", "fee-receipts");
        onOpenChange(false);
        await onSuccess();

        if (next.feePaymentId) {
          window.open(
            `/${schoolSlug}/fees/receipts/${next.feePaymentId}`,
            "_blank",
          );
        }
      }
    } catch (error) {
      if (showToast) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to verify Cashfree payment.",
        );
      }
    } finally {
      if (showToast) setCheckingCashfree(false);
    }
  }

  useEffect(() => {
    if (!cashfreeOrder || cashfreeOrder.status !== "ACTIVE") return;
    const timer = window.setInterval(() => {
      void checkCashfreePayment(false);
    }, 4000);
    return () => window.clearInterval(timer);
    // Poll only while the current Cashfree order is active.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashfreeOrder?.orderId, cashfreeOrder?.status, schoolSlug]);

  async function openCashfreeCheckout() {
    if (!cashfreeOrder) return;

    const cashfreeFactory = (
      window as unknown as {
        Cashfree?: (options: { mode: "sandbox" | "production" }) => {
          checkout(options: {
            paymentSessionId: string;
            redirectTarget: "_modal";
          }): Promise<{ error?: { message?: string } }>;
        };
      }
    ).Cashfree;

    if (!cashfreeFactory || !cashfreeSdkReady) {
      toast.error("Secure checkout is still loading. Please try again.");
      return;
    }

    setOpeningCashfree(true);
    try {
      const result = await cashfreeFactory({ mode: cashfreeOrder.mode }).checkout(
        {
          paymentSessionId: cashfreeOrder.paymentSessionId,
          redirectTarget: "_modal",
        },
      );
      if (result?.error) {
        throw new Error(
          result.error.message || "Cashfree checkout could not be opened.",
        );
      }
      await checkCashfreePayment();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Cashfree checkout could not be opened.",
      );
    } finally {
      setOpeningCashfree(false);
    }
  }

  async function copyCashfreeLink() {
    if (!cashfreeOrder) return;
    await navigator.clipboard.writeText(cashfreeOrder.publicUrl);
    toast.success("Payment link copied.");
  }

  /* ------------------------------------------------------------------------ */
  /* Submit                                                                   */
  /* ------------------------------------------------------------------------ */

  async function submit() {
    if (selectedInstallmentIds.length === 0) {
      toast.error("Select at least one installment.");

      return;
    }

    /* ---------------------------------------------------------------------- */
    /* Validate amounts                                                       */
    /* ---------------------------------------------------------------------- */

    for (const installment of selectedInstallments) {
      const amount = paymentAmounts[installment.id] ?? 0;

      const blockingInstallment = getBlockingInstallment(installment);

      if (blockingInstallment) {
        toast.error(
          `Pay ${blockingInstallment.name} in full before paying ${installment.name}.`,
        );

        return;
      }

      if (amount <= 0) {
        toast.error(`Enter a valid payment amount for ${installment.name}.`);

        return;
      }

      if (amount > installment.outstanding) {
        toast.error(
          `Payment for ${installment.name} cannot exceed ${money(
            installment.outstanding,
          )}.`,
        );

        return;
      }

      if (
        paymentMode === "ONLINE" &&
        Math.abs(amount - installment.outstanding) > 0.005
      ) {
        toast.error(
          `Cashfree must collect the full balance for ${installment.name}.`,
        );
        return;
      }
    }

    if (totalPayment <= 0) {
      toast.error("Enter a payment amount.");

      return;
    }

    try {
      setLoading(true);

      if (paymentMode === "ONLINE") {
        if (!schoolSlug) {
          toast.error("Online payments are unavailable on this page.");
          return;
        }
        if (customerPhone && !/^[6-9]\d{9}$/.test(customerPhone)) {
          toast.error("Enter a valid 10-digit Indian mobile number.");
          return;
        }

        const response = await fetch(
          "/api/v1/online-payments/cashfree/staff/orders",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              schoolSlug,
              studentEnrollmentId,
              installmentIds: selectedInstallmentIds,
              idempotencyKey: crypto.randomUUID(),
              ...(customerPhone ? { customerPhone } : {}),
            }),
          },
        );
        const result = (await response.json()) as {
          success: boolean;
          message?: string;
          data?: Omit<CashfreeOrder, "status" | "feePaymentId">;
        };
        if (!response.ok || !result.data) {
          throw new Error(result.message || "Unable to prepare Cashfree payment.");
        }
        setCashfreeOrder({ ...result.data, status: "ACTIVE" });
        toast.success("Cashfree payment is ready. Scan the QR or pay on this device.");
        return;
      }

      /* -------------------------------------------------------------------- */
      /* Build allocations                                                     */
      /* -------------------------------------------------------------------- */

      const allocations = selectedInstallments.map((installment) => ({
        studentFeeInstallmentId: installment.id,

        amount: paymentAmounts[installment.id] ?? 0,
      }));

      /* -------------------------------------------------------------------- */
      /* Submit                                                                */
      /* -------------------------------------------------------------------- */

      const response = await fetch("/api/v1/fee-payments", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          studentEnrollmentId,

          allocations,

          paymentDate,

          paymentMode,

          referenceNo: referenceNo.trim() || undefined,

          remarks: remarks.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Unable to record this payment.");

        return;
      }

      toast.success("Fee payment recorded successfully.");
      refreshTable("student-fees", "fee-payments", "fee-receipts");

      const newPaymentId = result.data?.id;

      onOpenChange(false);

      await onSuccess();

      if (newPaymentId && schoolSlug) {
        window.open(`/${schoolSlug}/fees/receipts/${newPaymentId}`, "_blank");
      }
    } catch (error) {
      console.error("Fee payment error:", error);

      toast.error("Failed to record the payment. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-6">
      {cashfreeOrder && (
        <>
          <Script
            src="https://sdk.cashfree.com/js/v3/cashfree.js"
            strategy="afterInteractive"
            onReady={() => setCashfreeSdkReady(true)}
          />
          <section className="space-y-4 rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/80 to-white p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <QrCode className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold">Cashfree payment ready</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Scan this QR code or open secure checkout on this device. The receipt is created only after Cashfree confirms payment.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 rounded-2xl border bg-white p-4 sm:flex-row sm:items-start">
              {cashfreeOrder.status === "PAID" ? (
                <div className="flex size-48 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="size-16" />
                </div>
              ) : (
                <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                  <QRCode value={cashfreeOrder.publicUrl} size={190} level="M" />
                </div>
              )}

              <div className="w-full space-y-3 sm:pt-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-xl font-bold">{money(cashfreeOrder.amount)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  Secure payment by Cashfree
                </div>
                {cashfreeOrder.status === "PAID" ? (
                  <p className="text-sm font-medium text-emerald-700">Payment received and receipt created.</p>
                ) : (
                  <>
                    <Button type="button" className="w-full rounded-xl" onClick={openCashfreeCheckout} disabled={openingCashfree}>
                      {openingCashfree ? <LoaderCircle className="size-4 animate-spin" /> : <Smartphone className="size-4" />}
                      {openingCashfree ? "Opening checkout..." : "Pay on this device"}
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="outline" className="rounded-xl" onClick={copyCashfreeLink}>
                        <Copy className="size-4" /> Copy link
                      </Button>
                      <Button type="button" variant="outline" className="rounded-xl" onClick={() => void checkCashfreePayment()} disabled={checkingCashfree}>
                        {checkingCashfree && <LoaderCircle className="size-4 animate-spin" />}
                        Check payment
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Order ID: {cashfreeOrder.orderId}
            </p>
          </section>
        </>
      )}
      {/* ==================================================================== */}
      {/* PAYMENT ALLOCATION                                                   */}
      {/* ==================================================================== */}

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Payment Allocation</h3>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Select installments from one or multiple fee plans and enter the
              amount to collect.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={selectAllOutstanding}
            >
              Select All
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-lg"
              onClick={clearSelection}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border">
          {sortedInstallments.map((installment) => {
            const checked = selectedInstallmentIds.includes(installment.id);
            const blockingInstallment = checked
              ? null
              : getBlockingInstallment(installment);

            const enteredAmount =
              paymentAmounts[installment.id] ?? installment.outstanding;

            return (
              <div
                key={installment.id}
                className={`border-b p-4 last:border-b-0 transition-colors ${
                  checked ? "bg-primary/[0.03]" : "bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    className="mt-1"
                    checked={checked}
                    disabled={Boolean(blockingInstallment)}
                    onCheckedChange={() => toggleInstallment(installment.id)}
                    aria-label={`Select ${installment.name}`}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      {/* LEFT */}

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold">{installment.name}</h4>

                          {installment.feePlanName && (
                            <Badge
                              variant="outline"
                              className="border-primary/20 bg-primary/10 text-primary"
                            >
                              {installment.feePlanName}
                            </Badge>
                          )}

                          {checked && (
                            <Badge
                              variant="outline"
                              className="border-emerald-200 bg-emerald-50 text-emerald-700"
                            >
                              Selected
                            </Badge>
                          )}

                          {blockingInstallment && (
                            <Badge variant="secondary">Locked</Badge>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {installment.feeCategoryName && (
                            <span>{installment.feeCategoryName}</span>
                          )}

                          {installment.dueDate && (
                            <span>Due {formatDate(installment.dueDate)}</span>
                          )}
                        </div>

                        {blockingInstallment && (
                          <p className="mt-2 text-xs font-medium text-amber-700">
                            Pay {blockingInstallment.name} in full to unlock this
                            installment.
                          </p>
                        )}

                        <div className="mt-2">
                          <span className="text-xs text-muted-foreground">
                            Outstanding
                          </span>

                          <p className="font-semibold">
                            {money(installment.outstanding)}
                          </p>
                        </div>
                      </div>

                      {/* RIGHT */}

                      {checked && (
                        <div className="w-full shrink-0 lg:w-44">
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                            Pay Now
                          </label>

                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                            <Input
                              type="number"
                              min="0"
                              max={installment.outstanding}
                              step="0.01"
                              value={enteredAmount}
                              disabled={paymentMode === "ONLINE"}
                              onChange={(event) =>
                                updatePaymentAmount(
                                  installment,
                                  event.target.value,
                                )
                              }
                              className="h-10 rounded-xl pl-8 font-semibold"
                            />
                          </div>

                          {paymentMode !== "ONLINE" && <button
                            type="button"
                            onClick={() =>
                              setPaymentAmounts((current) => ({
                                ...current,
                                [installment.id]: installment.outstanding,
                              }))
                            }
                            className="mt-1.5 text-xs font-medium text-primary hover:underline"
                          >
                            Pay full balance
                          </button>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          You can collect payment from multiple fee plans in one receipt.
          Installments within the same fee plan must be paid in sequence.
        </p>
      </section>

      {/* ==================================================================== */}
      {/* SUMMARY                                                              */}
      {/* ==================================================================== */}

      <section className="overflow-hidden rounded-2xl border bg-muted/30">
        <div className="border-b bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <ReceiptIndianRupee className="size-4 text-primary" />
            </div>

            <div>
              <h3 className="text-sm font-semibold">Payment Summary</h3>

              <p className="text-xs text-muted-foreground">
                Review the collection before recording it.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Selected Installments</span>

            <span className="font-semibold">{selectedInstallments.length}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Fee Plans</span>

            <span className="font-semibold">{selectedPlanCount}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Outstanding</span>

            <span className="font-semibold">{money(selectedOutstanding)}</span>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Collecting Now
                </p>

                <p className="mt-1 text-2xl font-bold tracking-tight text-primary">
                  {money(totalPayment)}
                </p>
              </div>

              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
                <Wallet className="size-5 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* PAYMENT DETAILS                                                      */}
      {/* ==================================================================== */}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-muted-foreground" />

          <h3 className="text-sm font-semibold">Payment Details</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* DATE */}

          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Date</label>

            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* MODE */}

          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Mode</label>

            <Select value={paymentMode} onValueChange={changePaymentMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>

                <SelectItem value="UPI">UPI</SelectItem>

                <SelectItem value="CARD">Card</SelectItem>

                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>

                <SelectItem value="CHEQUE">Cheque</SelectItem>

                {schoolSlug && <SelectItem value="ONLINE">Online · Cashfree</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* REFERENCE */}

        {paymentMode !== "CASH" && paymentMode !== "ONLINE" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Reference Number</label>

            <div className="relative">
              <Landmark className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                placeholder={
                  paymentMode === "CHEQUE"
                    ? "Cheque number"
                    : "Transaction reference number"
                }
                value={referenceNo}
                onChange={(event) => setReferenceNo(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        )}

        {paymentMode === "ONLINE" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Payer mobile number
              <span className="ml-1 font-normal text-muted-foreground">(Optional)</span>
            </label>
            <div className="relative">
              <Smartphone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                inputMode="numeric"
                maxLength={10}
                placeholder="Uses student or parent number when blank"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Cashfree collects the full outstanding balance for the selected installments.
            </p>
          </div>
        )}

        {/* REMARKS */}

        {paymentMode !== "ONLINE" && <div className="space-y-2">
          <label className="text-sm font-medium">
            Remarks
            <span className="ml-1 font-normal text-muted-foreground">
              (Optional)
            </span>
          </label>

          <Textarea
            placeholder="Add any notes about this payment..."
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            className="min-h-24 resize-none"
          />
        </div>}
      </section>

      {/* ==================================================================== */}
      {/* ACTIONS                                                              */}
      {/* ==================================================================== */}

      <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={() => onOpenChange(false)}
          disabled={loading}
        >
          Cancel
        </Button>

        <Button
          type="button"
          className="min-w-48 rounded-xl"
          onClick={submit}
          disabled={
            loading ||
            Boolean(cashfreeOrder) ||
            selectedInstallmentIds.length === 0 ||
            totalPayment <= 0
          }
        >
          {loading ? (
            paymentMode === "ONLINE" ? "Preparing Cashfree..." : "Recording Payment..."
          ) : (
            <>
              {paymentMode === "ONLINE" ? <CreditCard className="size-4" /> : <CheckCircle2 className="size-4" />}
              {paymentMode === "ONLINE" ? `Continue with Cashfree · ${money(totalPayment)}` : `Collect ${money(totalPayment)}`}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dialog                                                                     */
/* -------------------------------------------------------------------------- */

export function RecordFeePaymentDialog({
  open,
  onOpenChange,
  schoolSlug,
  studentEnrollmentId,
  installments,
  onSuccess,
}: Props) {
  const formKey = `${studentEnrollmentId}-${open ? "open" : "closed"}-${installments
    .map((item) => item.id)
    .join("-")}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
              <ReceiptIndianRupee className="size-5 text-primary" />
            </div>

            <div>
              <DialogTitle className="text-lg">Record Fee Payment</DialogTitle>

              <p className="mt-1 text-sm text-muted-foreground">
                Collect payment from one or multiple fee plans in a single
                receipt.
              </p>
            </div>
          </div>
        </DialogHeader>

        {open && (
          <PaymentForm
            key={formKey}
            schoolSlug={schoolSlug}
            studentEnrollmentId={studentEnrollmentId}
            installments={installments}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
