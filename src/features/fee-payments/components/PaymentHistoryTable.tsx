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

function getPaymentModeLabel(mode: string) {
  return mode.replaceAll("_", " ");
}

export function PaymentHistoryTable({ rows, schoolSlug, onVoid }: Props) {
  return (
    <Card className="overflow-hidden border-border/60 shadow-sm">
      <CardHeader className="border-b bg-muted/20 px-5 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Payment Records</CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              Complete history of fee payments and receipts.
            </p>
          </div>

          {rows.length > 0 && (
            <Badge variant="secondary" className="rounded-lg">
              {rows.length} records
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-medium">No payment records found</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Try changing your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left">
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Receipt No
                  </th>

                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Date
                  </th>

                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Student
                  </th>

                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Class
                  </th>

                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Mode
                  </th>

                  <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Items
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Amount
                  </th>

                  <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b transition-colors last:border-b-0 hover:bg-muted/20"
                  >
                    <td className="px-5 py-4 font-semibold">
                      {payment.receiptNo}
                    </td>

                    <td className="px-5 py-4 text-muted-foreground">
                      {formatDate(payment.paymentDate)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-medium">
                        {payment.student.fullName || "—"}
                      </div>

                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Adm. No: {payment.student.admissionNo}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <Badge
                        variant="outline"
                        className="rounded-lg font-normal"
                      >
                        {payment.student.class}
                        {payment.student.section
                          ? ` · ${payment.student.section}`
                          : ""}
                      </Badge>
                    </td>

                    <td className="px-5 py-4">
                      <Badge variant="outline" className="rounded-lg">
                        {getPaymentModeLabel(payment.paymentMode)}
                      </Badge>
                    </td>

                    <td className="px-5 py-4 text-center">
                      {payment.allocationCount}
                    </td>

                    <td className="px-5 py-4 text-right font-bold">
                      {money(payment.amount)}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <Badge
                        variant={
                          payment.status === "SUCCESS"
                            ? "secondary"
                            : "destructive"
                        }
                        className="rounded-lg"
                      >
                        {payment.status}
                      </Badge>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() =>
                            window.open(
                              `/${schoolSlug}/fees/receipts/${payment.id}`,
                              "_blank",
                            )
                          }
                        >
                          <ExternalLink className="mr-2 size-4" />
                          Receipt
                        </Button>

                        {payment.status === "SUCCESS" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg text-destructive hover:text-destructive"
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
