import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  totalAmount: number;
  totalConcession: number;
  totalPayable: number;
  totalPaid: number;
  outstanding: number;
};

function money(value: number) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

export function FeeSummaryCard({
  totalAmount,
  totalConcession,
  totalPayable,
  totalPaid,
  outstanding,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fee Summary</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <span>Total Fee</span>

          <span className="font-medium">{money(totalAmount)}</span>
        </div>

        <div className="flex justify-between">
          <span>Concession</span>

          <span className="font-medium">{money(totalConcession)}</span>
        </div>

        <div className="flex justify-between">
          <span>Total Payable</span>

          <span className="font-medium">{money(totalPayable)}</span>
        </div>

        <div className="flex justify-between">
          <span>Total Paid</span>

          <span className="font-medium">{money(totalPaid)}</span>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between">
            <span className="font-semibold">Outstanding</span>

            <span className="font-bold">{money(outstanding)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
