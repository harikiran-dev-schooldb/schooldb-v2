"use client";

import { useMemo, useState } from "react";

import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  IndianRupee,
  Landmark,
  ReceiptIndianRupee,
  Wallet,
} from "lucide-react";

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
      setSelectedInstallmentIds((current) =>
        current.filter((id) => id !== installmentId),
      );

      setPaymentAmounts((current) => {
        const next = { ...current };

        delete next[installmentId];

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
     * We only ensure the previous installment of the SAME fee plan
     * has been selected first.
     */

    const samePlanInstallments = sortedInstallments.filter(
      (item) =>
        item.feePlanId === clickedInstallment.feePlanId ||
        item.feePlanName === clickedInstallment.feePlanName,
    );

    const samePlanIndex = samePlanInstallments.findIndex(
      (item) => item.id === clickedInstallment.id,
    );

    if (samePlanIndex > 0) {
      const previousInstallment = samePlanInstallments[samePlanIndex - 1];

      const previousSelected = selectedInstallmentIds.includes(
        previousInstallment.id,
      );

      if (!previousSelected) {
        toast.error(
          `Please select ${previousInstallment.name} from ${
            clickedInstallment.feePlanName ?? "this fee plan"
          } first.`,
        );

        return;
      }
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
    if (value === "") {
      setPaymentAmounts((current) => ({
        ...current,
        [installment.id]: 0,
      }));

      return;
    }

    let amount = Number(value);

    if (!Number.isFinite(amount)) {
      amount = 0;
    }

    amount = Math.max(0, amount);

    if (amount > installment.outstanding) {
      amount = installment.outstanding;
    }

    setPaymentAmounts((current) => ({
      ...current,
      [installment.id]: amount,
    }));
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
    }

    if (totalPayment <= 0) {
      toast.error("Enter a payment amount.");

      return;
    }

    try {
      setLoading(true);

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
                    onCheckedChange={() => toggleInstallment(installment.id)}
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
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {installment.feeCategoryName && (
                            <span>{installment.feeCategoryName}</span>
                          )}

                          {installment.dueDate && (
                            <span>Due {formatDate(installment.dueDate)}</span>
                          )}
                        </div>

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
                              onChange={(event) =>
                                updatePaymentAmount(
                                  installment,
                                  event.target.value,
                                )
                              }
                              className="h-10 rounded-xl pl-8 font-semibold"
                            />
                          </div>

                          <button
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
                          </button>
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
          Installments within the same fee plan must be selected in sequence.
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

            <Select value={paymentMode} onValueChange={setPaymentMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>

                <SelectItem value="UPI">UPI</SelectItem>

                <SelectItem value="CARD">Card</SelectItem>

                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>

                <SelectItem value="CHEQUE">Cheque</SelectItem>

                <SelectItem value="ONLINE">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* REFERENCE */}

        {paymentMode !== "CASH" && (
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

        {/* REMARKS */}

        <div className="space-y-2">
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
        </div>
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
            loading || selectedInstallmentIds.length === 0 || totalPayment <= 0
          }
        >
          {loading ? (
            "Recording Payment..."
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              Collect {money(totalPayment)}
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
