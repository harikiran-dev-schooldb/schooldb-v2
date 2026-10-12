"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { refreshTable } from "@/lib/table-event";

type VoidPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  paymentId: string;
  receiptNo: string;
  cashfree?: boolean;

  onSuccess: () => void;
};

export function VoidPaymentDialog({
  open,
  onOpenChange,
  paymentId,
  receiptNo,
  cashfree = false,
  onSuccess,
}: VoidPaymentDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVoid() {
    if (reason.trim().length < 3) {
      setError("Void reason must be at least 3 characters.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/v1/fee-payments/${paymentId}/void`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: reason.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || `Failed to ${cashfree ? "refund" : "void"} payment.`);
      }

      setReason("");

      onOpenChange(false);

      refreshTable("fee-payments", "fee-receipts", "student-fees");
      onSuccess();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : `Failed to ${cashfree ? "refund" : "void"} payment.`,
      );
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!loading) {
      if (!nextOpen) {
        setReason("");
        setError(null);
      }

      onOpenChange(nextOpen);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cashfree ? "Refund Cashfree Payment" : "Void Payment"}</DialogTitle>

          <DialogDescription>
            {cashfree ? "Request a Cashfree refund for" : "Void payment receipt"}{" "}
            <span className="font-medium">{receiptNo}</span>. Fee balances will
            be reversed only after the {cashfree ? "gateway confirms the refund" : "void is recorded"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium">{cashfree ? "Refund" : "Void"} Reason</label>

          <Textarea
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);

              if (error) {
                setError(null);
              }
            }}
            placeholder={`Enter reason for ${cashfree ? "refunding" : "voiding"} this payment...`}
            disabled={loading}
            rows={4}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={handleVoid}
            disabled={loading || reason.trim().length < 3}
          >
            {loading
              ? cashfree ? "Requesting refund..." : "Voiding..."
              : cashfree ? "Request Refund" : "Void Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
