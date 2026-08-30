"use client";

import {
  CircleDollarSign,
  CreditCard,
  ReceiptText,
  WalletCards,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  summary: {
    installmentCount: number;
    totalPayable: number;
    totalConcession: number;
    totalPaid: number;
    outstanding: number;
  };
};

function money(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

const metrics = [
  {
    key: "installments",
    label: "Installments",
    icon: ReceiptText,
    getValue: (summary: Props["summary"]) =>
      summary.installmentCount.toLocaleString("en-IN"),
    description: "Total fee installments",
    iconClass: "bg-violet-500/10 text-violet-600",
    accentClass: "bg-violet-500",
  },
  {
    key: "payable",
    label: "Total Payable",
    icon: WalletCards,
    getValue: (summary: Props["summary"]) => money(summary.totalPayable),
    description: "Total amount assigned",
    iconClass: "bg-blue-500/10 text-blue-600",
    accentClass: "bg-blue-500",
  },
  {
    key: "paid",
    label: "Paid",
    icon: CreditCard,
    getValue: (summary: Props["summary"]) => money(summary.totalPaid),
    description: "Amount collected",
    iconClass: "bg-emerald-500/10 text-emerald-600",
    accentClass: "bg-emerald-500",
  },
  {
    key: "outstanding",
    label: "Outstanding",
    icon: CircleDollarSign,
    getValue: (summary: Props["summary"]) => money(summary.outstanding),
    description: "Amount remaining",
    iconClass: "bg-amber-500/10 text-amber-600",
    accentClass: "bg-amber-500",
  },
] as const;

export function OutstandingFeesSummary({ summary }: Props) {
  return (
    <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <Card
            key={metric.key}
            className={cn(
              "group relative overflow-hidden rounded-2xl",
              "border-border/60 bg-card",
              "shadow-[0_8px_30px_rgba(15,23,42,0.045)]",
              "transition-all duration-200",
              "hover:-translate-y-0.5",
              "hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]",
            )}
          >
            {/* Accent line */}
            <div
              className={cn(
                "absolute inset-x-0 top-0 h-0.5 opacity-70",
                metric.accentClass,
              )}
            />

            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                {/* Icon */}
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center",
                    "rounded-xl",
                    "transition-transform duration-200",
                    "group-hover:scale-105",
                    metric.iconClass,
                  )}
                >
                  <Icon className="size-4.5" strokeWidth={2} />
                </div>

                {/* Label */}
                <p className="pt-1 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {metric.label}
                </p>
              </div>

              {/* Value */}
              <div className="mt-5">
                <p className="truncate text-2xl font-bold tracking-tight text-foreground">
                  {metric.getValue(summary)}
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
