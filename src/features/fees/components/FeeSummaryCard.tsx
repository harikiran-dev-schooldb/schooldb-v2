import {
  CircleDollarSign,
  ReceiptIndianRupee,
  TrendingDown,
  WalletCards,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  totalAmount: number;
  totalConcession: number;
  totalPayable: number;
  totalPaid: number;
  outstanding: number;
};

function money(value: number) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

export function FeeSummaryCard({
  totalAmount,
  totalConcession,
  totalPayable,
  totalPaid,
  outstanding,
}: Props) {
  const collectionPercentage =
    totalPayable > 0 ? Math.round((totalPaid / totalPayable) * 100) : 0;

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
      <CardHeader className="border-b bg-muted/20 px-5 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Fee Summary</CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              Overall fee and collection overview.
            </p>
          </div>

          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
            <WalletCards className="size-5 text-primary" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        <div className="space-y-1">
          {/* Total Fee */}
          <div className="flex items-center justify-between gap-4 rounded-xl px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <ReceiptIndianRupee className="size-4 text-muted-foreground" />
              </div>

              <span className="text-sm text-muted-foreground">Total Fee</span>
            </div>

            <span className="font-semibold">{money(totalAmount)}</span>
          </div>

          {/* Concession */}
          <div className="flex items-center justify-between gap-4 rounded-xl px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <TrendingDown className="size-4 text-muted-foreground" />
              </div>

              <span className="text-sm text-muted-foreground">Concession</span>
            </div>

            <span className="font-semibold text-muted-foreground">
              − {money(totalConcession)}
            </span>
          </div>

          {/* Total Payable */}
          <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/50 px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <WalletCards className="size-4 text-muted-foreground" />
              </div>

              <span className="text-sm font-medium">Total Payable</span>
            </div>

            <span className="font-bold">{money(totalPayable)}</span>
          </div>

          {/* Total Paid */}
          <div className="flex items-center justify-between gap-4 rounded-xl px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <ReceiptIndianRupee className="size-4 text-primary" />
              </div>

              <span className="text-sm text-muted-foreground">Total Paid</span>
            </div>

            <span className="font-bold text-primary">{money(totalPaid)}</span>
          </div>
        </div>

        {/* Collection Progress */}
        <div className="mt-5 border-t border-border/60 pt-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Collection Progress</span>

            <span className="text-sm font-bold text-primary">
              {collectionPercentage}%
            </span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${Math.min(collectionPercentage, 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Outstanding */}
        <div className="mt-5 flex items-center justify-between rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-orange-500/10">
              <CircleDollarSign className="size-5 text-orange-600" />
            </div>

            <div>
              <p className="text-sm font-medium">Outstanding Balance</p>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Amount remaining to collect
              </p>
            </div>
          </div>

          <span className="text-lg font-bold text-orange-600">
            {money(outstanding)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
