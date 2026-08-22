"use client";

import { useEffect, useMemo, useState } from "react";

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
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  schoolSlug?: string;

  studentFeeId: string;
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
  const sortedInstallments = useMemo(() => {
    return [...installments].sort(
      (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
    );
  }, [installments]);

  const firstInstallmentId = sortedInstallments[0]?.id;

  const [selectedInstallmentIds, setSelectedInstallmentIds] = useState<
    string[]
  >(() => (firstInstallmentId ? [firstInstallmentId] : []));

  /*
   * Stores manually entered payment amounts.
   *
   * Example:
   *
   * {
   *   "installment-id-1": 5000,
   *   "installment-id-2": 2500
   * }
   */
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, number>>(
    {},
  );

  const [paymentMode, setPaymentMode] = useState("CASH");

  const [paymentDate, setPaymentDate] = useState(getToday);

  const [referenceNo, setReferenceNo] = useState("");

  const [remarks, setRemarks] = useState("");

  const [loading, setLoading] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* Initialize first installment                                            */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!firstInstallmentId) return;

    const firstInstallment = sortedInstallments[0];

    setSelectedInstallmentIds([firstInstallmentId]);

    setPaymentAmounts({
      [firstInstallmentId]: firstInstallment.outstanding,
    });
  }, [firstInstallmentId, sortedInstallments]);

  /* ------------------------------------------------------------------------ */
  /* Selected installments                                                   */
  /* ------------------------------------------------------------------------ */

  const selectedInstallments = useMemo(() => {
    return sortedInstallments.filter((installment) =>
      selectedInstallmentIds.includes(installment.id),
    );
  }, [selectedInstallmentIds, sortedInstallments]);

  /* ------------------------------------------------------------------------ */
  /* Total outstanding                                                       */
  /* ------------------------------------------------------------------------ */

  const selectedOutstanding = useMemo(() => {
    return selectedInstallments.reduce(
      (sum, installment) => sum + installment.outstanding,
      0,
    );
  }, [selectedInstallments]);

  /* ------------------------------------------------------------------------ */
  /* Actual entered payment total                                            */
  /* ------------------------------------------------------------------------ */

  const totalPayment = useMemo(() => {
    return selectedInstallments.reduce(
      (sum, installment) => sum + (paymentAmounts[installment.id] ?? 0),
      0,
    );
  }, [paymentAmounts, selectedInstallments]);

  /* ------------------------------------------------------------------------ */
  /* Toggle installment                                                      */
  /* ------------------------------------------------------------------------ */

  function toggleInstallment(installmentId: string) {
    const clickedIndex = sortedInstallments.findIndex(
      (item) => item.id === installmentId,
    );

    if (clickedIndex === -1) return;

    const currentlySelected = selectedInstallmentIds.includes(installmentId);

    /*
     * Removing an installment also removes all terms after it.
     *
     * Example:
     *
     * Q1 ✓
     * Q2 ✓
     * Q3 ✓
     *
     * Remove Q2:
     *
     * Q1 ✓
     * Q2 ✗
     * Q3 ✗
     */
    if (currentlySelected) {
      const remainingInstallments = sortedInstallments.slice(0, clickedIndex);

      const remainingIds = remainingInstallments.map((item) => item.id);

      const newAmounts: Record<string, number> = {};

      remainingIds.forEach((id) => {
        newAmounts[id] = paymentAmounts[id] ?? 0;
      });

      setSelectedInstallmentIds(remainingIds);

      setPaymentAmounts(newAmounts);

      return;
    }

    /*
     * Previous terms must be selected first.
     */
    const previousIds = sortedInstallments
      .slice(0, clickedIndex)
      .map((item) => item.id);

    const allPreviousSelected = previousIds.every((id) =>
      selectedInstallmentIds.includes(id),
    );

    if (!allPreviousSelected) {
      toast.error("Please select the previous term first.");

      return;
    }

    const installment = sortedInstallments[clickedIndex];

    setSelectedInstallmentIds((current) => [...current, installmentId]);

    /*
     * Default amount = full outstanding amount.
     *
     * User can manually edit it.
     */
    setPaymentAmounts((current) => ({
      ...current,
      [installmentId]: installment.outstanding,
    }));
  }

  /* ------------------------------------------------------------------------ */
  /* Update manual amount                                                    */
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

    /*
     * Prevent negative amounts.
     */
    amount = Math.max(0, amount);

    /*
     * Prevent payment greater than outstanding.
     */
    if (amount > installment.outstanding) {
      amount = installment.outstanding;
    }

    setPaymentAmounts((current) => ({
      ...current,
      [installment.id]: amount,
    }));
  }

  /* ------------------------------------------------------------------------ */
  /* Submit                                                                  */
  /* ------------------------------------------------------------------------ */

  async function submit() {
    if (selectedInstallmentIds.length === 0) {
      toast.error("Select at least one installment.");

      return;
    }

    /*
     * Validate selected terms are consecutive.
     */
    const selectedIndexes = sortedInstallments
      .map((item, index) =>
        selectedInstallmentIds.includes(item.id) ? index : -1,
      )
      .filter((index) => index !== -1);

    const isConsecutive = selectedIndexes.every(
      (index, position) => index === position,
    );

    if (!isConsecutive) {
      toast.error("Previous unpaid terms must be selected first.");

      return;
    }

    /*
     * Validate entered amounts.
     */
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

      /*
       * Send MANUALLY entered amounts.
       */
      const allocations = selectedInstallments.map((installment) => ({
        studentFeeInstallmentId: installment.id,

        amount: paymentAmounts[installment.id] ?? 0,
      }));

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
  /* Render                                                                  */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-6">
      {/* -------------------------------------------------------------- */}
      {/* Installment Selection                                          */}
      {/* -------------------------------------------------------------- */}

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Payment Allocation</h3>

          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Select installments and enter the amount you want to collect for
            each term.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border">
          {sortedInstallments.map((installment, index) => {
            const checked = selectedInstallmentIds.includes(installment.id);

            const previousTermsSelected = sortedInstallments
              .slice(0, index)
              .every((item) => selectedInstallmentIds.includes(item.id));

            const disabled = !checked && !previousTermsSelected;

            const enteredAmount =
              paymentAmounts[installment.id] ?? installment.outstanding;

            return (
              <div
                key={installment.id}
                className={`border-b p-4 last:border-b-0 ${
                  disabled ? "bg-muted/30 opacity-50" : "bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    className="mt-1"
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={() => toggleInstallment(installment.id)}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold">{installment.name}</h4>

                          {checked && (
                            <Badge
                              variant="outline"
                              className="border-primary/20 bg-primary/10 text-primary"
                            >
                              Selected
                            </Badge>
                          )}
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Outstanding balance
                        </p>

                        <p className="mt-0.5 font-semibold">
                          {money(installment.outstanding)}
                        </p>
                      </div>

                      {checked && (
                        <div className="w-full sm:w-40">
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
          Terms must be selected in sequence. You can collect a partial amount
          from any selected term.
        </p>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Payment Summary                                                */}
      {/* -------------------------------------------------------------- */}

      <section className="overflow-hidden rounded-2xl border bg-muted/30">
        <div className="border-b bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <ReceiptIndianRupee className="size-4 text-primary" />
            </div>

            <div>
              <h3 className="text-sm font-semibold">Payment Summary</h3>

              <p className="text-xs text-muted-foreground">
                Review the collection amount.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Selected Terms</span>

            <span className="font-semibold">{selectedInstallments.length}</span>
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

      {/* -------------------------------------------------------------- */}
      {/* Payment Details                                                */}
      {/* -------------------------------------------------------------- */}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-muted-foreground" />

          <h3 className="text-sm font-semibold">Payment Details</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Payment date */}

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

          {/* Payment mode */}

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

        {/* Reference */}

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

        {/* Remarks */}

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

      {/* -------------------------------------------------------------- */}
      {/* Actions                                                        */}
      {/* -------------------------------------------------------------- */}

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
  studentFeeId,
  studentEnrollmentId,
  installments,
  onSuccess,
}: Props) {
  const formKey = `${studentFeeId}-${studentEnrollmentId}-${open ? "open" : "closed"}-${installments
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
                Select terms and enter the amount to collect.
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
