import {
  Banknote,
  Building2,
  CreditCard,
  Landmark,
  ReceiptIndianRupee,
  Smartphone,
  WalletCards,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  paymentModes: Record<
    string,
    {
      count: number;
      amount: number;
    }
  >;
};

function money(value: number) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function getModeLabel(mode: string) {
  return mode
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getModeIcon(mode: string) {
  switch (mode) {
    case "CASH":
      return Banknote;

    case "UPI":
      return Smartphone;

    case "CARD":
      return CreditCard;

    case "BANK_TRANSFER":
      return Landmark;

    case "CHEQUE":
      return Building2;

    case "ONLINE":
      return ReceiptIndianRupee;

    default:
      return WalletCards;
  }
}

export function PaymentModesCard({ paymentModes }: Props) {
  const modes = Object.entries(paymentModes);

  const totalAmount = modes.reduce(
    (sum, [, value]) => sum + Number(value.amount),
    0,
  );

  const totalPayments = modes.reduce(
    (sum, [, value]) => sum + Number(value.count),
    0,
  );

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
      <CardHeader className="border-b bg-muted/20 px-5 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Payment Modes</CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              Collection breakdown by payment method.
            </p>
          </div>

          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
            <WalletCards className="size-5 text-primary" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {modes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <ReceiptIndianRupee className="size-6 text-muted-foreground" />
            </div>

            <h3 className="mt-4 font-semibold">No payments recorded</h3>

            <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
              Payment method statistics will appear here after fee collections
              are recorded.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {modes.map(([mode, value]) => {
              const Icon = getModeIcon(mode);

              const amount = Number(value.amount);

              const percentage =
                totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0;

              return (
                <div
                  key={mode}
                  className="rounded-xl border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                        <Icon className="size-4 text-muted-foreground" />
                      </div>

                      <div className="min-w-0">
                        <p className="font-medium">{getModeLabel(mode)}</p>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {value.count}{" "}
                          {value.count === 1 ? "payment" : "payments"}
                          <span className="mx-1">·</span>
                          {percentage}% of collection
                        </p>
                      </div>
                    </div>

                    <p className="shrink-0 font-bold">{money(amount)}</p>
                  </div>

                  {/* Payment mode proportion */}
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(percentage, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Footer summary */}
            <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-5">
              <div>
                <p className="text-sm font-medium">Total Collections</p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {totalPayments} {totalPayments === 1 ? "payment" : "payments"}{" "}
                  recorded
                </p>
              </div>

              <p className="text-lg font-bold text-primary">
                {money(totalAmount)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
