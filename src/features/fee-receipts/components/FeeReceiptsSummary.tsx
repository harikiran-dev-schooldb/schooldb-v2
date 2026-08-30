"use client";

import { CreditCard, IndianRupee, ReceiptText } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type Props = {
  paymentCount: number;
  totalAmount: number;
};

function money(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

export function FeeReceiptsSummary({ paymentCount, totalAmount }: Props) {
  const metrics = [
    {
      label: "Total Payments",
      value: paymentCount.toLocaleString("en-IN"),
      description: "Recorded fee payments",
      icon: ReceiptText,
      iconClass: "bg-violet-500/10 text-violet-600",
      accentClass: "bg-violet-500",
    },
    {
      label: "Total Collection",
      value: money(totalAmount),
      description: "Total amount collected",
      icon: IndianRupee,
      iconClass: "bg-emerald-500/10 text-emerald-600",
      accentClass: "bg-emerald-500",
    },
  ];

  return (
    <div className="grid w-full gap-4 sm:grid-cols-2">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <Card
            key={metric.label}
            className="group relative overflow-hidden rounded-2xl border-border/60 bg-card shadow-[0_8px_30px_rgba(15,23,42,0.045)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
          >
            {/* Accent */}
            <div
              className={`absolute inset-x-0 top-0 h-0.5 opacity-70 ${metric.accentClass}`}
            />

            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${metric.iconClass} transition-transform duration-200 group-hover:scale-105`}
                >
                  <Icon className="size-4.5" strokeWidth={2} />
                </div>

                <p className="pt-1 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {metric.label}
                </p>
              </div>

              <div className="mt-5">
                <p className="truncate text-2xl font-bold tracking-tight text-foreground">
                  {metric.value}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {metric.description}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
