import { Clock3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Bucket = { count: number; amount: number };

export function FeeAgingCard({
  ageing,
  collectionEfficiency,
}: {
  ageing: Record<"current" | "days31To60" | "days61To90" | "over90", Bucket>;
  collectionEfficiency: number;
}) {
  const rows = [
    { key: "current" as const, label: "1–30 days", tone: "bg-amber-400" },
    { key: "days31To60" as const, label: "31–60 days", tone: "bg-orange-500" },
    { key: "days61To90" as const, label: "61–90 days", tone: "bg-rose-500" },
    { key: "over90" as const, label: "Over 90 days", tone: "bg-red-700" },
  ];
  const maximum = Math.max(1, ...rows.map((row) => ageing[row.key].amount));

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
      <CardHeader className="border-b border-border/60">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Outstanding fee ageing</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Active-student balances grouped by days overdue.
            </p>
          </div>
          <div className="rounded-xl bg-indigo-50 px-3 py-2 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">Collection efficiency</p>
            <p className="text-xl font-black text-indigo-700">{collectionEfficiency}%</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        {rows.map((row) => {
          const bucket = ageing[row.key];
          return (
            <div key={row.key}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-medium"><Clock3 className="size-3.5 text-muted-foreground" />{row.label}</span>
                <span className="font-semibold">₹{bucket.amount.toLocaleString("en-IN")} · {bucket.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${row.tone}`} style={{ width: `${(bucket.amount / maximum) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
