"use client";

import { CalendarDays, ExternalLink, ReceiptText, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export type PaymentRow = {
  id: string;
  receiptNo: string;
  paymentDate: string;
  amount: number;
  paymentMode: string;

  student: {
    id: string;
    fullName: string | null;
    admissionNo: string;
    class: string;
    section: string;
  };
};

type Props = {
  schoolSlug: string;
  rows: PaymentRow[];
};

function money(value: number) {
  return `₹${Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatPaymentMode(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function FeeReceiptsTable({ schoolSlug, rows }: Props) {
  return (
    <Card className="w-full overflow-hidden rounded-2xl border-border/60 bg-card shadow-[0_8px_30px_rgba(15,23,42,0.045)]">
      {/* ------------------------------------------------------------------ */}
      {/* HEADER                                                             */}
      {/* ------------------------------------------------------------------ */}

      <CardHeader className="border-b border-border/60 bg-muted/10 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <ReceiptText className="size-4.5" />
            </div>

            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Payment History
              </h2>

              <p className="mt-0.5 text-xs text-muted-foreground">
                View collected fees and open payment receipts.
              </p>
            </div>
          </div>

          <div className="flex w-fit items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5">
            <Users className="size-3.5 text-muted-foreground" />

            <span className="text-xs font-semibold text-foreground">
              {rows.length.toLocaleString("en-IN")}
            </span>

            <span className="text-xs text-muted-foreground">
              {rows.length === 1 ? "payment" : "payments"}
            </span>
          </div>
        </div>
      </CardHeader>

      {/* ------------------------------------------------------------------ */}
      {/* CONTENT                                                            */}
      {/* ------------------------------------------------------------------ */}

      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <ReceiptText className="size-6 text-muted-foreground" />
            </div>

            <h3 className="mt-4 font-semibold text-foreground">
              No payments found
            </h3>

            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Payment records will appear here once fee collections have been
              recorded.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              {/* ---------------------------------------------------------- */}
              {/* TABLE HEADER                                                */}
              {/* ---------------------------------------------------------- */}

              <thead>
                <tr className="border-b border-border/60 bg-muted/20">
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Receipt No
                  </th>

                  <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Date
                  </th>

                  <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Student
                  </th>

                  <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Class
                  </th>

                  <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Payment Mode
                  </th>

                  <th className="px-4 py-3.5 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Amount
                  </th>

                  <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>

              {/* ---------------------------------------------------------- */}
              {/* TABLE BODY                                                  */}
              {/* ---------------------------------------------------------- */}

              <tbody className="divide-y divide-border/50">
                {rows.map((payment) => (
                  <tr
                    key={payment.id}
                    className="group transition-colors hover:bg-muted/20"
                  >
                    {/* Receipt */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <ReceiptText className="size-4" />
                        </div>

                        <div>
                          <p className="font-semibold text-foreground">
                            {payment.receiptNo}
                          </p>

                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            Payment receipt
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                        <CalendarDays className="size-3.5" />

                        <span>{formatDate(payment.paymentDate)}</span>
                      </div>
                    </td>

                    {/* Student */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                          <Users className="size-4 text-muted-foreground" />
                        </div>

                        <div className="min-w-0">
                          <p className="max-w-[190px] truncate font-semibold text-foreground">
                            {payment.student.fullName || "Unnamed Student"}
                          </p>

                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {payment.student.admissionNo}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Class */}
                    <td className="px-4 py-4">
                      <div className="whitespace-nowrap">
                        <p className="font-medium text-foreground">
                          {payment.student.class}
                        </p>

                        {payment.student.section && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Section {payment.student.section}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Mode */}
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-lg border border-border/60 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                        {formatPaymentMode(payment.paymentMode)}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-4 text-right">
                      <span className="font-bold text-emerald-600">
                        {money(payment.amount)}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-right">
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
                        <ExternalLink className="mr-2 size-3.5" />
                        Receipt
                      </Button>
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
