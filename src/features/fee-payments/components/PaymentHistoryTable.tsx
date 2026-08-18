"use client";

import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type PaymentRow = {
  id: string;
  receiptNo: string;
  paymentDate: string;
  amount: number;
  paymentMode: string;
  referenceNo: string | null;
  remarks: string | null;
  status: string;

  student: {
    id: string;
    fullName: string | null;
    admissionNo: string;
    class: string;
    section: string;
  };

  allocationCount: number;
};

type Props = {
  rows: PaymentRow[];
  schoolSlug: string;

  onVoid: (payment: PaymentRow) => void;
};

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PaymentHistoryTable({ rows, schoolSlug, onVoid }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Records</CardTitle>
      </CardHeader>

      <CardContent>
        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No payment records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3">Receipt No</th>

                  <th className="p-3">Date</th>

                  <th className="p-3">Student</th>

                  <th className="p-3">Class</th>

                  <th className="p-3">Mode</th>

                  <th className="p-3 text-center">Items</th>

                  <th className="p-3 text-right">Amount</th>

                  <th className="p-3 text-center">Status</th>

                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((payment) => (
                  <tr key={payment.id} className="border-b last:border-b-0">
                    <td className="p-3 font-medium">{payment.receiptNo}</td>

                    <td className="p-3">{formatDate(payment.paymentDate)}</td>

                    <td className="p-3">
                      <div className="font-medium">
                        {payment.student.fullName || "—"}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {payment.student.admissionNo}
                      </div>
                    </td>

                    <td className="p-3">
                      {payment.student.class}

                      {payment.student.section
                        ? ` - ${payment.student.section}`
                        : ""}
                    </td>

                    <td className="p-3">
                      <Badge variant="outline">{payment.paymentMode}</Badge>
                    </td>

                    <td className="p-3 text-center">
                      {payment.allocationCount}
                    </td>

                    <td className="p-3 text-right font-semibold">
                      {money(payment.amount)}
                    </td>

                    <td className="p-3 text-center">
                      <Badge
                        variant={
                          payment.status === "SUCCESS"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {payment.status}
                      </Badge>
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(
                              `/${schoolSlug}/fees/receipts/${payment.id}`,
                              "_blank",
                            )
                          }
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Receipt
                        </Button>

                        {payment.status === "SUCCESS" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => onVoid(payment)}
                          >
                            Void
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
