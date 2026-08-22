"use client";

import {
  Banknote,
  CreditCard,
  ExternalLink,
  Landmark,
  ReceiptIndianRupee,
  Smartphone,
  UserRound,
} from "lucide-react";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { FeeDashboardData } from "../types/fee-dashboard.types";

type Props = {
  payments: FeeDashboardData["recentPayments"];
};

function money(value: number | string) {
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
  return mode.replaceAll("_", " ");
}

function getPaymentModeIcon(mode: string) {
  switch (mode) {
    case "CASH":
      return Banknote;

    case "UPI":
      return Smartphone;

    case "CARD":
      return CreditCard;

    case "BANK_TRANSFER":
      return Landmark;

    default:
      return ReceiptIndianRupee;
  }
}

function getPaymentModeClass(mode: string) {
  switch (mode) {
    case "CASH":
      return "border-primary/20 bg-primary/10 text-primary";

    case "UPI":
      return "border-primary/20 bg-primary/10 text-primary";

    case "CARD":
      return "border-border bg-muted text-muted-foreground";

    case "BANK_TRANSFER":
      return "border-orange-500/20 bg-orange-500/10 text-orange-600";

    case "CHEQUE":
      return "border-orange-500/20 bg-orange-500/10 text-orange-600";

    case "ONLINE":
      return "border-primary/20 bg-primary/10 text-primary";

    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export function RecentPaymentsTable({ payments }: Props) {
  const { schoolSlug } = useParams<{
    schoolSlug: string;
  }>();

  function openReceipt(paymentId: string) {
    window.open(
      `/${schoolSlug}/fees/receipts/${paymentId}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 px-5 py-5 sm:px-6">
        <div>
          <CardTitle className="text-base font-semibold">
            Recent Payments
          </CardTitle>

          <p className="mt-1 text-sm text-muted-foreground">
            Latest fee collections recorded in the system.
          </p>
        </div>

        {payments.length > 0 && (
          <Badge variant="secondary" className="shrink-0 rounded-lg px-3 py-1">
            {payments.length} recent
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <ReceiptIndianRupee className="size-6 text-muted-foreground" />
            </div>

            <h3 className="mt-4 font-semibold">No payments recorded yet</h3>

            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Fee payments recorded by the school will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left">
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Receipt
                    </th>

                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Student
                    </th>

                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Class
                    </th>

                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Payment Date
                    </th>

                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Mode
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Amount
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map((payment) => {
                    const student = payment.studentEnrollment.student;

                    const className =
                      payment.studentEnrollment.class?.name || "—";

                    const sectionName =
                      payment.studentEnrollment.section?.name || "";

                    const ModeIcon = getPaymentModeIcon(payment.paymentMode);

                    return (
                      <tr
                        key={payment.id}
                        className="border-b transition-colors last:border-b-0 hover:bg-muted/20"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                              <ReceiptIndianRupee className="size-4 text-muted-foreground" />
                            </div>

                            <span className="font-semibold">
                              {payment.receiptNo}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                              <UserRound className="size-4 text-primary" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {student.fullName || "—"}
                              </p>

                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Adm. No: {student.admissionNo}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <Badge
                            variant="outline"
                            className="rounded-lg font-normal"
                          >
                            {className}
                            {sectionName ? ` · ${sectionName}` : ""}
                          </Badge>
                        </td>

                        <td className="px-5 py-4 text-muted-foreground">
                          {formatDate(payment.paymentDate)}
                        </td>

                        <td className="px-5 py-4">
                          <Badge
                            variant="outline"
                            className={`gap-1.5 rounded-lg ${getPaymentModeClass(
                              payment.paymentMode,
                            )}`}
                          >
                            <ModeIcon className="size-3.5" />

                            {getPaymentModeLabel(payment.paymentMode)}
                          </Badge>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span className="text-base font-bold text-primary">
                            {money(payment.amount)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            onClick={() => openReceipt(payment.id)}
                          >
                            <ExternalLink className="mr-2 size-4" />
                            Receipt
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}

            <div className="divide-y md:hidden">
              {payments.map((payment) => {
                const student = payment.studentEnrollment.student;

                const className = payment.studentEnrollment.class?.name || "—";

                const sectionName =
                  payment.studentEnrollment.section?.name || "";

                const ModeIcon = getPaymentModeIcon(payment.paymentMode);

                return (
                  <div key={payment.id} className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <UserRound className="size-5 text-primary" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {student.fullName || "—"}
                          </p>

                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Adm. No: {student.admissionNo}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-base font-bold text-primary">
                          {money(payment.amount)}
                        </p>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(payment.paymentDate)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Receipt</p>

                        <p className="mt-1 font-medium">{payment.receiptNo}</p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">Class</p>

                        <p className="mt-1 font-medium">
                          {className}
                          {sectionName ? ` · ${sectionName}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <Badge
                        variant="outline"
                        className={`gap-1.5 rounded-lg ${getPaymentModeClass(
                          payment.paymentMode,
                        )}`}
                      >
                        <ModeIcon className="size-3.5" />

                        {getPaymentModeLabel(payment.paymentMode)}
                      </Badge>

                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => openReceipt(payment.id)}
                      >
                        <ExternalLink className="mr-2 size-4" />
                        Receipt
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
