import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  today: number;
  todayPaymentCount: number;
  thisMonth: number;
  thisMonthPaymentCount: number;
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
  totalPayable,
  outstanding,
}: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Today's Collection
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="text-2xl font-bold">{money(today)}</div>

          <p className="text-xs text-muted-foreground">
            {todayPaymentCount} payments
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">This Month</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="text-2xl font-bold">{money(thisMonth)}</div>

          <p className="text-xs text-muted-foreground">
            {thisMonthPaymentCount} payments
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Total Payable</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="text-2xl font-bold">{money(totalPayable)}</div>

          <p className="text-xs text-muted-foreground">After concessions</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="text-2xl font-bold">{money(outstanding)}</div>

          <p className="text-xs text-muted-foreground">Amount remaining</p>
        </CardContent>
      </Card>
    </div>
  );
}
