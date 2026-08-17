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

export function PaymentModesCard({ paymentModes }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Modes</CardTitle>
      </CardHeader>

      <CardContent>
        {Object.keys(paymentModes).length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No payments recorded.
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(paymentModes).map(([mode, value]) => (
              <div key={mode} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{mode}</div>

                  <div className="text-xs text-muted-foreground">
                    {value.count} payments
                  </div>
                </div>

                <div className="font-semibold">{money(value.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
