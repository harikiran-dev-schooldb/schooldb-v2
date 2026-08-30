"use client";

import {
  AlertCircle,
  CalendarDays,
  CreditCard,
  ReceiptText,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import type { OutstandingRow } from "@/features/student-fees/types/outstanding-fees";

type Props = {
  rows: OutstandingRow[];
  onCollect: (row: OutstandingRow) => void;
};

function money(value: number) {
  return `₹${value.toLocaleString("en-IN", {
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

function statusLabel(status: string) {
  switch (status) {
    case "PARTIAL":
      return "Partially Paid";
    case "PENDING":
      return "Pending";
    default:
      return status;
  }
}

export function OutstandingFeesTable({ rows, onCollect }: Props) {
  return (
    <Card className="w-full overflow-hidden rounded-2xl border-border/60 bg-card shadow-[0_8px_30px_rgba(15,23,42,0.045)]">
      {/* ------------------------------------------------------------------ */}
      {/* HEADER                                                             */}
      {/* ------------------------------------------------------------------ */}

      <CardHeader className="border-b border-border/60 bg-muted/10 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <ReceiptText className="size-4.5" />
            </div>

            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Outstanding Installments
              </h2>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Review pending and partially paid student fees.
              </p>
            </div>
          </div>

          <div className="flex w-fit items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5">
            <Users className="size-3.5 text-muted-foreground" />

            <span className="text-xs font-semibold text-foreground">
              {rows.length.toLocaleString("en-IN")}
            </span>

            <span className="text-xs text-muted-foreground">
              {rows.length === 1 ? "record" : "records"}
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
            <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10">
              <CreditCard className="size-6 text-emerald-600" />
            </div>

            <h3 className="mt-4 font-semibold text-foreground">
              No outstanding fees
            </h3>

            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              All fee installments are currently settled for the selected
              filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              {/* ---------------------------------------------------------- */}
              {/* TABLE HEADER                                                */}
              {/* ---------------------------------------------------------- */}

              <thead>
                <tr className="border-b border-border/60 bg-muted/20">
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Student
                  </th>

                  <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Class
                  </th>

                  <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Category
                  </th>

                  <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Installment
                  </th>

                  <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Due Date
                  </th>

                  <th className="px-4 py-3.5 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Payable
                  </th>

                  <th className="px-4 py-3.5 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Paid
                  </th>

                  <th className="px-4 py-3.5 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Outstanding
                  </th>

                  <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Status
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
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="group transition-colors hover:bg-muted/20"
                  >
                    {/* Student */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Users className="size-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="max-w-[190px] truncate font-semibold text-foreground">
                            {row.student.fullName || "Unnamed Student"}
                          </p>

                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {row.student.admissionNo || "No admission number"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Class */}
                    <td className="px-4 py-4">
                      <div className="whitespace-nowrap">
                        <p className="font-medium text-foreground">
                          {row.class.name}
                        </p>

                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Section {row.section.name}
                        </p>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                        {row.feeCategory.name}
                      </span>
                    </td>

                    {/* Installment */}
                    <td className="px-4 py-4">
                      <span className="font-medium text-foreground">
                        {row.installmentName}
                      </span>
                    </td>

                    {/* Due Date */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                        <CalendarDays className="size-3.5" />

                        <span>{formatDate(row.dueDate)}</span>
                      </div>
                    </td>

                    {/* Payable */}
                    <td className="px-4 py-4 text-right">
                      <span className="font-medium text-foreground">
                        {money(row.payableAmount)}
                      </span>
                    </td>

                    {/* Paid */}
                    <td className="px-4 py-4 text-right">
                      <span className="font-medium text-emerald-600">
                        {money(row.paidAmount)}
                      </span>
                    </td>

                    {/* Outstanding */}
                    <td className="px-4 py-4 text-right">
                      <span className="font-bold text-amber-600">
                        {money(row.outstanding)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <Badge
                        variant="outline"
                        className={
                          row.status === "PARTIAL"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }
                      >
                        <AlertCircle className="mr-1.5 size-3" />

                        {statusLabel(row.status)}
                      </Badge>
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-right">
                      <Button
                        size="sm"
                        onClick={() => onCollect(row)}
                        className="rounded-lg px-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                      >
                        Collect
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
