"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type Installment = {
  id: string;
  name: string;
  payableAmount: number;
  paidAmount: number;
  outstanding: number;
  status: "PAID" | "PENDING" | "PARTIAL";
};

type Props = {
  installments: Installment[];
  loading: boolean;
  onCollect: (installment: Installment) => void;
};

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export function FeeTermsCard({ installments, loading, onCollect }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fee Terms</CardTitle>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading fee details...
          </div>
        ) : installments.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No fee details found for this student.
          </div>
        ) : (
          <div className="space-y-3">
            {installments.map((installment) => (
              <div
                key={installment.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <div className="font-medium">{installment.name}</div>

                  <div className="mt-1 text-sm text-muted-foreground">
                    Payable: {money(installment.payableAmount)}
                    {" · "}
                    Paid: {money(installment.paidAmount)}
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Balance</div>

                    <div className="font-semibold">
                      {money(installment.outstanding)}
                    </div>
                  </div>

                  <Badge
                    variant={
                      installment.status === "PAID"
                        ? "secondary"
                        : installment.status === "PARTIAL"
                          ? "outline"
                          : "destructive"
                    }
                  >
                    {installment.status}
                  </Badge>

                  {installment.outstanding > 0 && (
                    <Button size="sm" onClick={() => onCollect(installment)}>
                      Collect
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
