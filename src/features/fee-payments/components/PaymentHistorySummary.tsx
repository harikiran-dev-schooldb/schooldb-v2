import { CircleDollarSign, ReceiptText } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type Props = {
  paymentCount: number;
  totalAmount: number;
};

function money(value: number) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

export function PaymentHistorySummary({ paymentCount, totalAmount }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Total Payments */}

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardContent className="flex items-center justify-between p-5 sm:p-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Total Payments
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight">
              {paymentCount.toLocaleString("en-IN")}
            </p>

            <p className="mt-2 text-xs text-muted-foreground">
              Payment records matching your filters
            </p>
          </div>

          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <ReceiptText className="size-5 text-primary" />
          </div>
        </CardContent>
      </Card>

      {/* Total Collection */}

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardContent className="flex items-center justify-between p-5 sm:p-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Total Collection
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-primary">
              {money(totalAmount)}
            </p>

            <p className="mt-2 text-xs text-muted-foreground">
              Total amount collected from displayed payments
            </p>
          </div>

          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <CircleDollarSign className="size-5 text-primary" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
