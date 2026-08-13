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

type VoidPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  paymentId: string;
  receiptNo: string;

  onSuccess: () => void;
};

export function VoidPaymentDialog({
  open,
  onOpenChange,
  paymentId,
  receiptNo,
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
        throw new Error(result.message || "Failed to void payment.");
      }

      setReason("");

      onOpenChange(false);

      onSuccess();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to void payment.",
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
          <DialogTitle>Void Payment</DialogTitle>

          <DialogDescription>
            Void payment receipt{" "}
            <span className="font-medium">{receiptNo}</span>. The payment amount
            will be reversed from the related fee installments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium">Void Reason</label>

          <Textarea
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);

              if (error) {
                setError(null);
              }
            }}
            placeholder="Enter reason for voiding this payment..."
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
            {loading ? "Voiding..." : "Void Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
