"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Installment = {
  id: string;
  feePlanItemId: string;
  academicPeriodId: string | null;
  name: string;
  amount: string;
  dueDate: string;
  sequence: number;
  periodStart: string | null;
  periodEnd: string | null;

  feePlanItem?: {
    frequency: string;
    feeCategory?: {
      name: string;
      code: string;
    };
  };

  academicPeriod?: {
    name: string;
    shortName?: string | null;
  } | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feePlanId: string;
  feePlanName: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatAmount(value: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function FeeInstallmentsDialog({
  open,
  onOpenChange,
  feePlanId,
  feePlanName,
}: Props) {
  const [installments, setInstallments] = useState<Installment[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !feePlanId) return;

    async function loadInstallments() {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/v1/fee-plans/${feePlanId}/installments`,
        );

        const result = await response.json();

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        setInstallments(result.data ?? []);
      } catch {
        toast.error("Failed to load fee installments.");
      } finally {
        setLoading(false);
      }
    }

    loadInstallments();
  }, [open, feePlanId]);

  const total = useMemo(() => {
    return installments.reduce(
      (sum, installment) => sum + Number(installment.amount),
      0,
    );
  }, [installments]);

  const groupedItems = useMemo(() => {
    const groups = new Map<
      string,
      {
        category: string;
        frequency: string;
        installments: Installment[];
      }
    >();

    for (const installment of installments) {
      const itemId = installment.feePlanItemId;

      if (!groups.has(itemId)) {
        groups.set(itemId, {
          category: installment.feePlanItem?.feeCategory?.name ?? "Fee",
          frequency: installment.feePlanItem?.frequency ?? "",
          installments: [],
        });
      }

      groups.get(itemId)!.installments.push(installment);
    }

    return Array.from(groups.values());
  }, [installments]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Fee Installments</DialogTitle>

          <p className="text-sm text-muted-foreground">{feePlanName}</p>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : installments.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center">
            <p className="font-medium">No installments found</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Generate installments for this fee plan to see them here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedItems.map((item) => (
              <div
                key={`${item.category}-${item.frequency}`}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{item.category}</h3>

                    <Badge variant="secondary" className="mt-1">
                      {item.frequency.replace("_", " ")}
                    </Badge>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {item.installments.length} installment
                    {item.installments.length !== 1 ? "s" : ""}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-4 py-3 text-left">#</th>

                        <th className="px-4 py-3 text-left">Installment</th>

                        <th className="px-4 py-3 text-right">Amount</th>

                        <th className="px-4 py-3 text-left">Due Date</th>

                        <th className="px-4 py-3 text-left">Period</th>
                      </tr>
                    </thead>

                    <tbody>
                      {item.installments.map((installment) => (
                        <tr
                          key={installment.id}
                          className="border-b last:border-0"
                        >
                          <td className="px-4 py-3">{installment.sequence}</td>

                          <td className="px-4 py-3 font-medium">
                            {installment.name}
                          </td>

                          <td className="px-4 py-3 text-right font-medium">
                            {formatAmount(installment.amount)}
                          </td>

                          <td className="px-4 py-3">
                            {formatDate(installment.dueDate)}
                          </td>

                          <td className="px-4 py-3">
                            {installment.periodStart && installment.periodEnd
                              ? `${formatDate(
                                  installment.periodStart,
                                )} – ${formatDate(installment.periodEnd)}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between rounded-md border bg-muted/30 p-4">
              <span className="font-semibold">Total Fee</span>

              <span className="text-lg font-bold">
                {formatAmount(total.toString())}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
