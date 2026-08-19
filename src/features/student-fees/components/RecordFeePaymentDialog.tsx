"use client";

import { useState } from "react";

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

function getToday() {
  return new Date().toISOString().split("T")[0];
}

type PaymentFormProps = {
  schoolSlug?: string;
  studentEnrollmentId: string;
  installments: Installment[];
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

function PaymentForm({
  schoolSlug,
  studentEnrollmentId,
  installments,
  onOpenChange,
  onSuccess,
}: PaymentFormProps) {
  const sortedInstallments = [...installments].sort(
    (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
  );

  const firstInstallmentId = sortedInstallments[0]?.id;

  const [selectedInstallmentIds, setSelectedInstallmentIds] = useState<
    string[]
  >(() => (firstInstallmentId ? [firstInstallmentId] : []));

  const [paymentMode, setPaymentMode] = useState("CASH");
  const [paymentDate, setPaymentDate] = useState(getToday);
  const [referenceNo, setReferenceNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleInstallment(installmentId: string) {
    const clickedIndex = sortedInstallments.findIndex(
      (item) => item.id === installmentId,
    );

    if (clickedIndex === -1) return;

    const currentlySelected = selectedInstallmentIds.includes(installmentId);

    if (currentlySelected) {
      setSelectedInstallmentIds(
        sortedInstallments.slice(0, clickedIndex).map((item) => item.id),
      );

      return;
    }

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

      if (!response.ok || !result.success) {
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
    <div className="space-y-5">
      <div className="space-y-3">
        <label className="text-sm font-medium">Select Terms to Pay</label>

        <div className="rounded-md border">
          {sortedInstallments.map((installment, index) => {
            const checked = selectedInstallmentIds.includes(installment.id);

            const previousTermsSelected = sortedInstallments
              .slice(0, index)
              .every((item) => selectedInstallmentIds.includes(item.id));

            const disabled = !checked && !previousTermsSelected;

            return (
              <label
                key={installment.id}
                className={`flex items-center justify-between gap-4 border-b p-3 last:border-b-0 ${
                  disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={() => toggleInstallment(installment.id)}
                  />

                  <div>
                    <div className="font-medium">{installment.name}</div>

                    <div className="text-xs text-muted-foreground">
                      Outstanding: ₹
                      {installment.outstanding.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>

                <div className="font-semibold">
                  ₹{installment.outstanding.toLocaleString("en-IN")}
                </div>
              </label>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Previous unpaid terms must be selected before selecting the next term.
        </p>
      </div>

      <div className="rounded-md border bg-muted/40 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">Selected Terms</span>

          <span className="font-medium">{selectedInstallments.length}</span>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="font-medium">Total Payment</span>

          <span className="text-lg font-bold">
            ₹{totalOutstanding.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Payment Date</label>

        <Input
          type="date"
          value={paymentDate}
          onChange={(event) => setPaymentDate(event.target.value)}
        />
      </div>

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

      <div className="space-y-2">
        <label className="text-sm font-medium">Remarks</label>

        <Textarea
          placeholder="Optional remarks"
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
        />
      </div>

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
          {loading
            ? "Saving..."
            : `Pay ₹${totalOutstanding.toLocaleString("en-IN")}`}
        </Button>
      </div>
    </div>
  );
}

export function RecordFeePaymentDialog({
  open,
  onOpenChange,
  schoolSlug,
  studentFeeId,
  studentEnrollmentId,
  installments,
  onSuccess,
}: Props) {
  const formKey = `${studentFeeId}-${open ? "open" : "closed"}-${installments
    .map((item) => item.id)
    .join("-")}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Fee Payment</DialogTitle>
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
