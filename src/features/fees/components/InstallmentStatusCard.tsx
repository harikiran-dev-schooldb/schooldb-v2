import {
  CheckCircle2,
  CircleOff,
  Clock3,
  CircleDollarSign,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  pendingCount: number;
  partialCount: number;
  paidCount: number;
  waivedCount: number;
};

export function InstallmentStatusCard({
  pendingCount,
  partialCount,
  paidCount,
  waivedCount,
}: Props) {
  const totalInstallments =
    pendingCount + partialCount + paidCount + waivedCount;

  const paidPercentage =
    totalInstallments > 0
      ? Math.round((paidCount / totalInstallments) * 100)
      : 0;

  const items = [
    {
      label: "Pending",
      value: pendingCount,
      description: "Awaiting payment",
      icon: Clock3,
      iconClass: "bg-muted text-muted-foreground",
      valueClass: "text-foreground",
    },
    {
      label: "Partial",
      value: partialCount,
      description: "Partially paid",
      icon: CircleDollarSign,
      iconClass: "bg-orange-500/10 text-orange-600",
      valueClass: "text-orange-600",
    },
    {
      label: "Paid",
      value: paidCount,
      description: "Fully collected",
      icon: CheckCircle2,
      iconClass: "bg-primary/10 text-primary",
      valueClass: "text-primary",
    },
    {
      label: "Waived",
      value: waivedCount,
      description: "Payment waived",
      icon: CircleOff,
      iconClass: "bg-muted text-muted-foreground",
      valueClass: "text-muted-foreground",
    },
  ];

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
      <CardHeader className="flex flex-col gap-4 border-b bg-muted/20 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <CardTitle className="text-base">Installment Status</CardTitle>

          <p className="mt-1 text-sm text-muted-foreground">
            Overview of all fee installment payment statuses.
          </p>
        </div>

        <div className="w-fit rounded-xl bg-primary/10 px-3 py-2 text-sm">
          <span className="font-bold text-primary">{paidPercentage}%</span>
          <span className="ml-1 text-muted-foreground">collected</span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className={`p-5 ${
                  index < items.length - 1
                    ? "border-b border-border/60 sm:border-r xl:border-b-0"
                    : ""
                } ${index === 1 ? "sm:border-r-0 xl:border-r" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex size-10 items-center justify-center rounded-xl ${item.iconClass}`}
                  >
                    <Icon className="size-5" />
                  </div>

                  <p className={`text-2xl font-bold ${item.valueClass}`}>
                    {item.value}
                  </p>
                </div>

                <div className="mt-5">
                  <p className="font-semibold">{item.label}</p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border/60 bg-muted/10 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Total installments</p>

            <p className="text-lg font-bold">{totalInstallments}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
