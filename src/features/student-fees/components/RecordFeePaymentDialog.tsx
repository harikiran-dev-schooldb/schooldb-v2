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

import { toast } from "sonner";

type Installment = {
  id: string;
  name: string;
  payableAmount: number;
  paidAmount: number;
  outstanding: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  studentFeeId: string;
  studentEnrollmentId: string;

  installments: Installment[];

  onSuccess: () => void;
};

export function RecordFeePaymentDialog({
  open,
  onOpenChange,
  studentEnrollmentId,
  installments,
  onSuccess,
}: Props) {
  const [installmentId, setInstallmentId] = useState("");

  const [amount, setAmount] = useState("");

  const [paymentMode, setPaymentMode] = useState("CASH");

  const [paymentDate, setPaymentDate] = useState("");

  const [referenceNo, setReferenceNo] = useState("");

  const [remarks, setRemarks] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const today = new Date().toISOString().split("T")[0];

    setPaymentDate(today);

    setInstallmentId(installments[0]?.id ?? "");

    setAmount(installments[0] ? String(installments[0].outstanding) : "");

    setPaymentMode("CASH");
    setReferenceNo("");
    setRemarks("");
  }, [open, installments]);

  function handleInstallmentChange(id: string) {
    setInstallmentId(id);

    const installment = installments.find((item) => item.id === id);

    if (installment) {
      setAmount(String(installment.outstanding));
    }
  }

  async function submit() {
    const numericAmount = Number(amount);

    if (!installmentId) {
      toast.error("Select an installment.");
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }

    const installment = installments.find((item) => item.id === installmentId);

    if (!installment) {
      toast.error("Installment not found.");
      return;
    }

    if (numericAmount > installment.outstanding) {
      toast.error(`Maximum payable amount is ₹${installment.outstanding}.`);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/v1/fee-payments", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          studentEnrollmentId,

          allocations: [
            {
              studentFeeInstallmentId: installmentId,

              amount: numericAmount,
            },
          ],

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

      onOpenChange(false);

      onSuccess();
    } catch {
      toast.error("Failed to record payment.");
    } finally {
      setLoading(false);
    }
  }

  const selectedInstallment = installments.find(
    (item) => item.id === installmentId,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Fee Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Installment */}

          <div className="space-y-2">
            <label className="text-sm font-medium">Installment</label>

            <Select
              value={installmentId}
              onValueChange={handleInstallmentChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select installment" />
              </SelectTrigger>

              <SelectContent>
                {installments.map((installment) => (
                  <SelectItem key={installment.id} value={installment.id}>
                    {installment.name} — ₹{installment.outstanding} outstanding
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Outstanding */}

          {selectedInstallment && (
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="flex justify-between text-sm">
                <span>Outstanding</span>

                <span className="font-semibold">
                  ₹{selectedInstallment.outstanding}
                </span>
              </div>
            </div>
          )}

          {/* Amount */}

          <div className="space-y-2">
            <label className="text-sm font-medium">Amount</label>

            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          {/* Date */}

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

            <Button type="button" onClick={submit} disabled={loading}>
              {loading ? "Saving..." : "Record Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
