"use client";

import { ExternalLink, ReceiptText } from "lucide-react";

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
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getPaymentModeLabel(mode: string) {
  return mode
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusClasses(status: string) {
  switch (status) {
    case "SUCCESS":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "VOID":
      return "border-red-200 bg-red-50 text-red-700";

    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";

    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export function PaymentHistoryTable({ rows, schoolSlug, onVoid }: Props) {
  return (
    <Card className="premium-card overflow-hidden rounded-2xl border-0">
      {/* ================================================================ */}
      {/* HEADER                                                           */}
      {/* ================================================================ */}

      <CardHeader className="border-b border-border/60 bg-muted/20 px-5 py-5 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <ReceiptText className="size-4 text-primary" />
            </div>

            <div>
              <CardTitle className="text-base font-bold tracking-tight">
                Payment Records
              </CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                Complete history of fee payments and receipts.
              </p>
            </div>
          </div>

          {rows.length > 0 && (
            <Badge
              variant="secondary"
              className="rounded-lg border border-border/60 bg-background px-2.5 py-1 text-xs font-medium"
            >
              {rows.length.toLocaleString("en-IN")} records
            </Badge>
          )}
        </div>
      </CardHeader>

      {/* ================================================================ */}
      {/* CONTENT                                                          */}
      {/* ================================================================ */}

      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
              <ReceiptText className="size-5 text-muted-foreground" />
            </div>

            <p className="mt-4 font-semibold">No payment records found</p>

            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Try changing your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-sm">
              {/* ======================================================== */}
              {/* TABLE HEADER                                              */}
              {/* ======================================================== */}

              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-left">
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Receipt No
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Date
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Student
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Class
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Mode
                  </th>

                  <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Items
                  </th>

                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Amount
                  </th>

                  <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>

              {/* ======================================================== */}
              {/* TABLE BODY                                                */}
              {/* ======================================================== */}

              <tbody>
                {rows.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-border/50 transition-colors last:border-b-0 hover:bg-muted/20"
                  >
                    {/* Receipt */}
                    <td className="px-5 py-4">
                      <span className="font-semibold text-foreground">
                        {payment.receiptNo}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                      {formatDate(payment.paymentDate)}
                    </td>

                    {/* Student */}
                    <td className="px-5 py-4">
                      <div className="min-w-[170px]">
                        <p className="font-semibold text-foreground">
                          {payment.student.fullName || "Unnamed Student"}
                        </p>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Adm. No: {payment.student.admissionNo}
                        </p>
                      </div>
                    </td>

                    {/* Class */}
                    <td className="px-5 py-4">
                      <Badge
                        variant="outline"
                        className="rounded-lg border-border/70 bg-background font-medium"
                      >
                        {payment.student.class}

                        {payment.student.section
                          ? ` · ${payment.student.section}`
                          : ""}
                      </Badge>
                    </td>

                    {/* Payment Mode */}
                    <td className="px-5 py-4">
                      <Badge
                        variant="outline"
                        className="rounded-lg border-border/70 bg-background font-medium"
                      >
                        {getPaymentModeLabel(payment.paymentMode)}
                      </Badge>
                    </td>

                    {/* Items */}
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex min-w-7 items-center justify-center rounded-lg bg-muted px-2 py-1 text-xs font-semibold">
                        {payment.allocationCount}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-4 text-right">
                      <span className="font-bold text-foreground">
                        {money(payment.amount)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 text-center">
                      <Badge
                        variant="outline"
                        className={`rounded-lg font-semibold ${getStatusClasses(
                          payment.status,
                        )}`}
                      >
                        {payment.status}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg border-border/70 bg-background"
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

                        {payment.status === "SUCCESS" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg text-destructive hover:bg-red-50 hover:text-destructive"
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
