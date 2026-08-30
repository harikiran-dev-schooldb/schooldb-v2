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
    <div className="grid gap-5 md:grid-cols-2">
      {/* ================================================================ */}
      {/* TOTAL PAYMENTS                                                   */}
      {/* ================================================================ */}

      <Card className="premium-card overflow-hidden rounded-2xl border-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <CardContent className="flex items-center justify-between p-5 sm:p-6">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Total Payments
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              {paymentCount.toLocaleString("en-IN")}
            </p>

            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Payment records matching your filters
            </p>
          </div>

          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/5">
            <ReceiptText className="size-5 text-primary" strokeWidth={2} />
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* TOTAL COLLECTION                                                 */}
      {/* ================================================================ */}

      <Card className="premium-card overflow-hidden rounded-2xl border-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <CardContent className="flex items-center justify-between p-5 sm:p-6">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Total Collection
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-primary">
              {money(totalAmount)}
            </p>

            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Total amount collected from displayed payments
            </p>
          </div>

          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/5">
            <CircleDollarSign className="size-5 text-primary" strokeWidth={2} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
