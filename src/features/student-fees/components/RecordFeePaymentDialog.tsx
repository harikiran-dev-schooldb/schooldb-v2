"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Checkbox } from "@/components/ui/checkbox";

import { toast } from "sonner";

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

export function RecordFeePaymentDialog({
  open,
  onOpenChange,
  schoolSlug,
  studentEnrollmentId,
  installments,
  onSuccess,
}: Props) {
  const [selectedInstallmentIds, setSelectedInstallmentIds] = useState<
    string[]
  >([]);

  const [paymentMode, setPaymentMode] = useState("CASH");

  const [paymentDate, setPaymentDate] = useState("");

  const [referenceNo, setReferenceNo] = useState("");

  const [remarks, setRemarks] = useState("");

  const [loading, setLoading] = useState(false);

  /*
   * Sort installments in payment order.
   * Oldest unpaid term comes first.
   */
  const sortedInstallments = installments;

  useEffect(() => {
    if (!open) return;

    const today = new Date().toISOString().split("T")[0];

    setPaymentDate(today);

    /*
     * Select the first unpaid installment by default.
     */
    setSelectedInstallmentIds(
      sortedInstallments[0]?.id ? [sortedInstallments[0].id] : [],
    );

    setPaymentMode("CASH");
    setReferenceNo("");
    setRemarks("");
  }, [open, installments]);

  /*
   * User can select only consecutive installments.
   *
   * Example:
   * Q1 unpaid
   * Q2 unpaid
   * Q3 unpaid
   *
   * Allowed:
   * ✓ Q1
   * ✓ Q1 + Q2
   * ✓ Q1 + Q2 + Q3
   *
   * Not allowed:
   * ✗ Q2 alone
   * ✗ Q1 + Q3
   */
  function toggleInstallment(installmentId: string) {
    const clickedIndex = sortedInstallments.findIndex(
      (item) => item.id === installmentId,
    );

    if (clickedIndex === -1) return;

    const currentlySelected = selectedInstallmentIds.includes(installmentId);

    if (currentlySelected) {
      /*
       * Remove this installment and all later terms.
       *
       * This keeps selection consecutive.
       */
      setSelectedInstallmentIds(
        sortedInstallments
          .slice(0, clickedIndex)
          .filter((item) => selectedInstallmentIds.includes(item.id))
          .map((item) => item.id),
      );

      return;
    }

    /*
     * Cannot skip previous unpaid terms.
     *
     * If clicking Q3, Q1 and Q2 must already
     * be selected.
     */
    const previousIds = sortedInstallments
      .slice(0, clickedIndex)
      .map((item) => item.id);

    const allPreviousSelected = previousIds.every((id) =>
      selectedInstallmentIds.includes(id),
    );

    if (!allPreviousSelected) {
      toast.error("Please select and pay the previous term first.");
      return;
    }

    setSelectedInstallmentIds((current) => [...current, installmentId]);
  }

  const selectedInstallments = sortedInstallments.filter((item) =>
    selectedInstallmentIds.includes(item.id),
  );

  const totalOutstanding = selectedInstallments.reduce(
    (sum, installment) => sum + installment.outstanding,
    0,
  );

  async function submit() {
    if (selectedInstallmentIds.length === 0) {
      toast.error("Select at least one installment.");
      return;
    }

    /*
     * Recheck consecutive terms before payment.
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
      toast.error("Previous unpaid terms must be paid first.");
      return;
    }

    try {
      setLoading(true);

      /*
       * Each selected term is paid in full.
       *
       * Example:
       * Q1 = ₹9,000
       * Q2 = ₹8,000
       *
       * One payment receipt = ₹17,000
       */
      const allocations = selectedInstallments.map((installment) => ({
        studentFeeInstallmentId: installment.id,

        amount: installment.outstanding,
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

      if (!result.success) {
        toast.error(result.message || "Payment failed.");
        return;
      }

      toast.success("Fee payment recorded successfully.");

      const newPaymentId = result.data?.id;

      onOpenChange(false);

      await onSuccess();

      if (newPaymentId && schoolSlug) {
        window.open(`/${schoolSlug}/fees/receipts/${newPaymentId}`, "_blank");
      }
    } catch {
      toast.error("Failed to record payment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Fee Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Installments */}

          <div className="space-y-3">
            <label className="text-sm font-medium">Select Terms to Pay</label>

            <div className="rounded-md border">
              {sortedInstallments.map((installment, index) => {
                const checked = selectedInstallmentIds.includes(installment.id);

                /*
                 * A term can be selected only when
                 * all previous terms are selected.
                 */
                const previousTermsSelected = sortedInstallments
                  .slice(0, index)
                  .every((item) => selectedInstallmentIds.includes(item.id));

                const disabled = !checked && !previousTermsSelected;

                return (
                  <label
                    key={installment.id}
                    className={`flex cursor-pointer items-center justify-between gap-4 border-b p-3 last:border-b-0 ${
                      disabled ? "cursor-not-allowed opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={() =>
                          toggleInstallment(installment.id)
                        }
                      />

                      <div>
                        <div className="font-medium">{installment.name}</div>

                        <div className="text-xs text-muted-foreground">
                          Outstanding: ₹{installment.outstanding}
                        </div>
                      </div>
                    </div>

                    <div className="font-semibold">
                      ₹{installment.outstanding}
                    </div>
                  </label>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground">
              Previous unpaid terms must be selected before selecting the next
              term.
            </p>
          </div>

          {/* Total */}

          <div className="rounded-md border bg-muted/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Selected Terms</span>

              <span className="font-medium">{selectedInstallments.length}</span>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="font-medium">Total Payment</span>

              <span className="text-lg font-bold">₹{totalOutstanding}</span>
            </div>
          </div>

          {/* Payment Date */}

          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Date</label>

            <Input
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
            />
          </div>

          {/* Payment Mode */}

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

          {/* Reference */}

          {paymentMode !== "CASH" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Reference No.</label>

              <Input
                placeholder="Transaction / cheque reference"
                value={referenceNo}
                onChange={(event) => setReferenceNo(event.target.value)}
              />
            </div>
          )}

          {/* Remarks */}

          <div className="space-y-2">
            <label className="text-sm font-medium">Remarks</label>

            <Textarea
              placeholder="Optional remarks"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
            />
          </div>

          {/* Buttons */}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={submit}
              disabled={loading || selectedInstallmentIds.length === 0}
            >
              {loading ? "Saving..." : `Pay ₹${totalOutstanding}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
