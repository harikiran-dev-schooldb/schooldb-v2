import {
  CalendarDays,
  CircleDollarSign,
  ReceiptIndianRupee,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type Props = {
  today: number;
  todayPaymentCount: number;
  thisMonth: number;
  thisMonthPaymentCount: number;
  previousMonth: number;
  thisMonthExpenses: number;
  thisMonthExpenseCount: number;
  netCashFlow: number;
  totalPayable: number;
  outstanding: number;
};

function money(value: number) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

export function FeeCollectionCards({
  today,
  todayPaymentCount,
  thisMonth,
  thisMonthPaymentCount,
  previousMonth,
  thisMonthExpenses,
  thisMonthExpenseCount,
  netCashFlow,
  totalPayable,
  outstanding,
}: Props) {
  const monthChange = previousMonth > 0
    ? ((thisMonth - previousMonth) / previousMonth) * 100
    : null;
  const cards = [
    {
      title: "Today's Collection",
      value: money(today),
      description: `${todayPaymentCount} ${
        todayPaymentCount === 1 ? "payment" : "payments"
      } received today`,
      icon: CalendarDays,
      iconClass: "bg-primary/10 text-primary",
      valueClass: "text-primary",
    },
    {
      title: "This Month",
      value: money(thisMonth),
      description: `${thisMonthPaymentCount} ${
        thisMonthPaymentCount === 1 ? "payment" : "payments"
      } · ${monthChange === null ? "No prior-month baseline" : `${monthChange >= 0 ? "+" : ""}${monthChange.toFixed(1)}% vs previous month`}`,
      icon: ReceiptIndianRupee,
      iconClass: "bg-primary/10 text-primary",
      valueClass: "text-foreground",
    },
    {
      title: "This Month Expenses",
      value: money(thisMonthExpenses),
      description: `${thisMonthExpenseCount} posted ${thisMonthExpenseCount === 1 ? "expense" : "expenses"}`,
      icon: WalletCards,
      iconClass: "bg-rose-500/10 text-rose-600",
      valueClass: "text-rose-600",
    },
    {
      title: "Net Cash Flow",
      value: money(netCashFlow),
      description: "Collections less posted expenses this month",
      icon: TrendingUp,
      iconClass: netCashFlow >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600",
      valueClass: netCashFlow >= 0 ? "text-emerald-700" : "text-rose-600",
    },
    {
      title: "Total Payable",
      value: money(totalPayable),
      description: "Net after RTE waivers and concessions",
      icon: WalletCards,
      iconClass: "bg-muted text-muted-foreground",
      valueClass: "text-foreground",
    },
    {
      title: "Outstanding",
      value: money(outstanding),
      description: "Amount still remaining to collect",
      icon: CircleDollarSign,
      iconClass: "bg-orange-500/10 text-orange-600",
      valueClass: "text-orange-600",
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card
            key={card.title}
            className="overflow-hidden rounded-2xl border-border/60 shadow-sm transition-shadow hover:shadow-md"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>

                  <p
                    className={`mt-3 text-2xl font-bold tracking-tight ${card.valueClass}`}
                  >
                    {card.value}
                  </p>
                </div>

                <div
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${card.iconClass}`}
                >
                  <Icon className="size-5" />
                </div>
              </div>

              <div className="mt-4 border-t border-border/60 pt-3">
                <p className="text-xs leading-5 text-muted-foreground">
                  {card.description}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
