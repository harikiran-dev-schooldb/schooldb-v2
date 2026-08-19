"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Installment = {
  id: string;
  name: string;
  amount: number;
  concession: number;
  paidAmount: number;
  payableAmount: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installment: Installment | null;
  onSuccess: () => void;
};

function ConcessionForm({
  installment,
  onOpenChange,
  onSuccess,
}: {
  installment: Installment;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [concession, setConcession] = useState(String(installment.concession));

  const [loading, setLoading] = useState(false);

  const amount = Number(installment.amount);
  const paid = Number(installment.paidAmount);

  const maximumConcession = Math.max(0, amount - paid);

  const newConcession = Number(concession || 0);

  const payable = Math.max(0, amount - newConcession);

  const isValidConcession =
    Number.isFinite(newConcession) &&
    newConcession >= 0 &&
    newConcession <= maximumConcession;

  async function save() {
    if (!isValidConcession) {
      toast.error(
        `Concession must be between ₹0 and ₹${maximumConcession.toLocaleString(
          "en-IN",
        )}.`,
      );

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

      if (!response.ok || !result.success) {
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
    <div className="space-y-5">
      <div className="rounded-md border p-4 text-sm">
        <div className="flex justify-between gap-4">
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
          onChange={(event) => setConcession(event.target.value)}
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
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={loading}
        >
          Cancel
        </Button>

        <Button
          type="button"
          onClick={save}
          disabled={loading || !isValidConcession}
        >
          {loading ? "Saving..." : "Save Concession"}
        </Button>
      </div>
    </div>
  );
}

export function ConcessionDialog({
  open,
  onOpenChange,
  installment,
  onSuccess,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply Concession</DialogTitle>
        </DialogHeader>

        {installment ? (
          <ConcessionForm
            key={installment.id}
            installment={installment}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
