import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  paymentCount: number;
  totalAmount: number;
};

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export function PaymentHistorySummary({ paymentCount, totalAmount }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-2xl font-bold">{paymentCount}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Total Collection
          </CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-2xl font-bold">{money(totalAmount)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
