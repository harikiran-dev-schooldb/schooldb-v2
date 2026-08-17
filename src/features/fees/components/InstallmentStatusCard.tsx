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
  const items = [
    {
      label: "Pending",
      value: pendingCount,
    },
    {
      label: "Partial",
      value: partialCount,
    },
    {
      label: "Paid",
      value: paidCount,
    },
    {
      label: "Waived",
      value: waivedCount,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Installment Status</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className="rounded-lg border p-4">
              <div className="text-2xl font-bold">{item.value}</div>

              <div className="text-sm text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
