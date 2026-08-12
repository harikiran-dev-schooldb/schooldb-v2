"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  installment: {
    id: string;
    name: string;
    amount: number;
    concession: number;
    paidAmount: number;
    payableAmount: number;
  } | null;

  onSuccess: () => void;
};

export function ConcessionDialog({
  open,
  onOpenChange,
  installment,
  onSuccess,
}: Props) {
  const [concession, setConcession] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!installment || !open) {
      return;
    }

    setConcession(String(installment.concession));
  }, [installment, open]);

  if (!installment) {
    return null;
  }

  const amount = Number(installment.amount);

  const paid = Number(installment.paidAmount);

  const maximumConcession = Math.max(0, amount - paid);

  const newConcession = Number(concession || 0);

  const payable = Math.max(0, amount - newConcession);

  async function save() {
    if (!installment) {
      return;
    }

    if (!Number.isFinite(newConcession) || newConcession < 0) {
      toast.error("Enter a valid concession amount.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `/api/v1/student-fee-installments/${installment.id}/concession`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            concession: newConcession,
          }),
        },
      );

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message || "Failed to update concession.");
        return;
      }

      toast.success("Concession updated successfully.");

      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("Failed to update concession.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply Concession</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-md border p-4 text-sm">
            <div className="flex justify-between">
              <span>Installment</span>

              <span className="font-medium">{installment.name}</span>
            </div>

            <div className="mt-2 flex justify-between">
              <span>Amount</span>

              <span>₹{amount.toLocaleString("en-IN")}</span>
            </div>

            <div className="mt-2 flex justify-between">
              <span>Already Paid</span>

              <span>₹{paid.toLocaleString("en-IN")}</span>
            </div>

            <div className="mt-2 flex justify-between font-medium">
              <span>Maximum Concession</span>

              <span>₹{maximumConcession.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Concession Amount
            </label>

            <Input
              type="number"
              min="0"
              max={maximumConcession}
              step="0.01"
              value={concession}
              onChange={(e) => setConcession(e.target.value)}
            />
          </div>

          <div className="rounded-md bg-muted p-4">
            <div className="flex justify-between text-sm">
              <span>New Payable Amount</span>

              <span className="font-semibold">
                ₹{payable.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button onClick={save} disabled={loading}>
              {loading ? "Saving..." : "Save Concession"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
