"use client";

import {
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  IndianRupee,
  WalletCards,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type Installment = {
  id: string;
  name: string;
  payableAmount: number;
  paidAmount: number;
  outstanding: number;
  status: "PAID" | "PENDING" | "PARTIAL";
};

type Props = {
  installments: Installment[];
  loading: boolean;
  onCollect: (installment: Installment) => void;
};

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function getStatusClass(status: Installment["status"]) {
  switch (status) {
    case "PAID":
      return "border-primary/20 bg-primary/10 text-primary";

    case "PARTIAL":
      return "border-orange-500/20 bg-orange-500/10 text-orange-600";

    case "PENDING":
      return "border-border bg-muted text-muted-foreground";
  }
}

export function FeeTermsCard({ installments, loading, onCollect }: Props) {
  const paidCount = installments.filter(
    (installment) => installment.status === "PAID",
  ).length;

  return (
    <div className="space-y-6">
      {/* Installments */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b bg-muted/30 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="font-semibold">Fee Installments</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Review installment balances and collect pending payments.
            </p>
          </div>

          {!loading && installments.length > 0 && (
            <Badge variant="secondary" className="w-fit rounded-lg px-3 py-1">
              {paidCount} of {installments.length} paid
            </Badge>
          )}
        </div>

        <CardContent className="p-4 sm:p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex size-12 animate-pulse items-center justify-center rounded-2xl bg-muted">
                <IndianRupee className="size-5 text-muted-foreground" />
              </div>

              <p className="mt-4 text-sm font-medium">Loading fee details...</p>

              <p className="mt-1 text-xs text-muted-foreground">
                Please wait while we retrieve the student's installments.
              </p>
            </div>
          ) : installments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
                <WalletCards className="size-6 text-muted-foreground" />
              </div>

              <h3 className="mt-4 font-semibold">
                No fee installments assigned
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                This student does not currently have any fee installments
                available for collection.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {installments.map((installment) => (
                <div
                  key={installment.id}
                  className="group flex flex-col gap-5 rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/20 sm:p-5 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{installment.name}</h3>

                      <Badge
                        variant="outline"
                        className={`rounded-lg ${getStatusClass(installment.status)}`}
                      >
                        {installment.status}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Payable</span>
                        <span className="ml-2 font-medium">
                          {money(installment.payableAmount)}
                        </span>
                      </div>

                      <div>
                        <span className="text-muted-foreground">Paid</span>
                        <span className="ml-2 font-medium">
                          {money(installment.paidAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                    <div className="min-w-28 lg:text-right">
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground lg:justify-end">
                        <Clock3 className="size-3.5" />
                        Outstanding
                      </p>

                      <p className="mt-1 text-lg font-bold tracking-tight">
                        {money(installment.outstanding)}
                      </p>
                    </div>

                    {installment.outstanding > 0 ? (
                      <Button
                        className="min-w-28 rounded-xl"
                        onClick={() => onCollect(installment)}
                      >
                        <IndianRupee className="size-4" />
                        Collect
                      </Button>
                    ) : (
                      <div className="flex min-w-28 items-center justify-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm font-medium text-muted-foreground">
                        <CheckCircle2 className="size-4" />
                        Completed
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
