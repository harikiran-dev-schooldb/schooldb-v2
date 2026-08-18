"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  return `₹${value.toLocaleString("en-IN")}`;
}

export function OutstandingFeesSummary({ summary }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Installments</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="text-2xl font-bold">{summary.installmentCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Total Payable</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="text-2xl font-bold">
            {money(summary.totalPayable)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Paid</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="text-2xl font-bold">{money(summary.totalPaid)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="text-2xl font-bold">{money(summary.outstanding)}</div>
        </CardContent>
      </Card>
    </div>
  );
}
