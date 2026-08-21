"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Gift,
  GraduationCap,
  History,
  Receipt,
  RefreshCw,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ConcessionDialog } from "./ConcessionDialog";
import { RecordFeePaymentDialog } from "./RecordFeePaymentDialog";

type Installment = {
  id: string;
  feeCategory: {
    id: string;
    name: string;
    code: string;
  };
  name: string;
  amount: number;
  concession: number;
  payableAmount: number;
  paidAmount: number;
  outstanding: number;
  dueDate: string;
  status: "PENDING" | "PARTIAL" | "PAID" | "WAIVED";
  sequence: number;
  periodStart: string | null;
  periodEnd: string | null;
};

type Payment = {
  id: string;
  receiptNo: string;
  paymentDate: string;
  amount: number;
  paymentMode: string;
  referenceNo: string | null;
  remarks: string | null;
  status: string;
  allocations: {
    installmentId: string;
    installmentName: string;
    amount: number;
    feeCategory: string;
  }[];
};

type Ledger = {
  studentFee: {
    id: string;
    studentEnrollmentId: string;
    feePlan: {
      id: string;
      name: string;
      academicYearId: string;
    };
    assignedAt: string;
  };
  student: {
    id: string;
    admissionNo: string;
    fullName: string | null;
    class: {
      id: string;
      name: string;
    };
    section: {
      id: string;
      name: string;
    };
  };
  academicYear: {
    id: string;
    name: string;
  };
  summary: {
    total: number;
    concession: number;
    paid: number;
    outstanding: number;
  };
  installments: Installment[];
  payments: Payment[];
};

type Props = {
  studentFeeId: string;
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function date(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getStatusBadge(status: Installment["status"]) {
  switch (status) {
    case "PAID":
      return {
        label: "Paid",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm",
      };

    case "PARTIAL":
      return {
        label: "Partial",
        className: "border-amber-200 bg-amber-50 text-amber-700 shadow-sm",
      };

    case "WAIVED":
      return {
        label: "Waived",
        className: "border-slate-200 bg-slate-100 text-slate-600 shadow-sm",
      };

    case "PENDING":
      return {
        label: "Due",
        className: "border-rose-200 bg-rose-50 text-rose-700 shadow-sm",
      };
  }
}

function getPaymentProgress(paid: number, payable: number) {
  if (payable <= 0) return 0;

  return Math.min(Math.round((paid / payable) * 100), 100);
}

export function StudentFeeLedger({ studentFeeId }: Props) {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [concessionOpen, setConcessionOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] =
    useState<Installment | null>(null);

  const params = useParams<{ schoolSlug: string }>();

  const loadLedger = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/v1/student-fees/${studentFeeId}/ledger`,
        {
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to load fee ledger.");
      }

      setLedger(result.data);
    } catch (error) {
      console.error(error);
      setLedger(null);
    } finally {
      setLoading(false);
    }
  }, [studentFeeId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadLedger();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadLedger]);

  if (loading) {
    return (
      <div className="space-y-6 py-2">
        <div className="h-64 animate-pulse rounded-[2rem] border border-slate-200 bg-slate-100" />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-40 animate-pulse rounded-3xl border border-slate-200 bg-slate-100"
            />
          ))}
        </div>

        <div className="h-44 animate-pulse rounded-3xl border border-slate-200 bg-slate-100" />
        <div className="h-96 animate-pulse rounded-3xl border border-slate-200 bg-slate-100" />
      </div>
    );
  }

  if (!ledger) {
    return (
      <Card className="min-h-[420px] overflow-hidden rounded-[2rem] border-slate-200 shadow-sm">
        <CardContent className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
          <div className="flex size-20 items-center justify-center rounded-3xl bg-rose-50 text-rose-500">
            <AlertCircle className="size-10" />
          </div>

          <h2 className="mt-6 text-2xl font-black tracking-tight text-slate-900">
            Fee Ledger Not Found
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            We couldn&apos;t retrieve the financial records for this student.
            Please refresh and try again.
          </p>

          <Button
            variant="outline"
            className="mt-6 rounded-xl"
            onClick={() => void loadLedger()}
          >
            <RefreshCw className="mr-2 size-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const unpaidInstallments = ledger.installments.filter(
    (item) => item.status === "PENDING" || item.status === "PARTIAL",
  );

  const collectionPercentage =
    ledger.summary.total > 0
      ? Math.min(
          Math.round(
            (ledger.summary.paid /
              Math.max(ledger.summary.total - ledger.summary.concession, 1)) *
              100,
          ),
          100,
        )
      : 0;

  const totalPayable = Math.max(
    ledger.summary.total - ledger.summary.concession,
    0,
  );

  const nextDueInstallment =
    unpaidInstallments
      .slice()
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      )[0] ?? null;

  const studentInitial =
    ledger.student.fullName?.charAt(0).toUpperCase() || "S";

  return (
    <div className="space-y-6 pb-8">
      {/* PREMIUM STUDENT FINANCIAL HERO */}
      <Card className="relative overflow-hidden rounded-[2rem] border-slate-200/80 bg-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500" />

        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-teal-100/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-indigo-100/40 blur-3xl" />

        <CardContent className="relative p-6 md:p-8">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-5">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-2xl font-black text-white shadow-lg shadow-teal-500/20 md:size-20 md:text-3xl">
                {studentInitial}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.2em] text-teal-600 uppercase">
                      Student Financial Profile
                    </p>

                    <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                      {ledger.student.fullName || "Student"}
                    </h1>
                  </div>

                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase shadow-sm">
                    Active Ledger
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700">
                    <UserRound className="size-3.5 text-slate-400" />
                    {ledger.student.admissionNo}
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700">
                    <GraduationCap className="size-3.5 text-slate-400" />
                    {ledger.student.class.name} · Sec{" "}
                    {ledger.student.section.name}
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700">
                    <CalendarDays className="size-3.5 text-slate-400" />
                    {ledger.academicYear.name}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
              <Button
                variant="outline"
                className="rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50"
                onClick={() => void loadLedger()}
                disabled={loading}
              >
                <RefreshCw
                  className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>

              <Button
                disabled={unpaidInstallments.length === 0}
                onClick={() => setPaymentOpen(true)}
                className="rounded-xl bg-slate-950 px-5 shadow-lg shadow-slate-900/15 transition-all hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <CreditCard className="mr-2 size-4" />
                Record Payment
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 border-t border-slate-100 pt-6 md:grid-cols-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">
                Fee Plan
              </p>
              <p className="mt-1.5 font-bold text-slate-900">
                {ledger.studentFee.feePlan.name}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">
                Installments
              </p>
              <p className="mt-1.5 font-bold text-slate-900">
                {ledger.installments.length} scheduled
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">
                Open Balance
              </p>
              <p
                className={`mt-1.5 font-black ${
                  ledger.summary.outstanding > 0
                    ? "text-rose-600"
                    : "text-emerald-600"
                }`}
              >
                {money(ledger.summary.outstanding)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PREMIUM FINANCIAL SUMMARY */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="group overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">
                  Total Fee
                </p>
                <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                  {money(ledger.summary.total)}
                </p>
              </div>

              <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Wallet className="size-5" />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs font-medium text-slate-400">
              <Banknote className="size-3.5" />
              Academic fee allocation
            </div>
          </CardContent>
        </Card>

        <Card className="group overflow-hidden rounded-3xl border-indigo-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-100/60">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-[0.16em] text-indigo-400 uppercase">
                  Concession
                </p>
                <p className="mt-3 text-2xl font-black tracking-tight text-indigo-600">
                  {money(ledger.summary.concession)}
                </p>
              </div>

              <div className="flex size-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Gift className="size-5" />
              </div>
            </div>

            <div className="mt-5 text-xs font-medium text-slate-400">
              Applied fee reduction
            </div>
          </CardContent>
        </Card>

        <Card className="group overflow-hidden rounded-3xl border-emerald-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-100/60">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-[0.16em] text-emerald-500 uppercase">
                  Amount Paid
                </p>
                <p className="mt-3 text-2xl font-black tracking-tight text-emerald-600">
                  {money(ledger.summary.paid)}
                </p>
              </div>

              <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="size-5" />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-emerald-600">
              <TrendingUp className="size-3.5" />
              {collectionPercentage}% collection progress
            </div>
          </CardContent>
        </Card>

        <Card className="group overflow-hidden rounded-3xl border-rose-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-100/60">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-[0.16em] text-rose-500 uppercase">
                  Outstanding
                </p>
                <p className="mt-3 text-2xl font-black tracking-tight text-rose-600">
                  {money(ledger.summary.outstanding)}
                </p>
              </div>

              <div className="flex size-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <AlertCircle className="size-5" />
              </div>
            </div>

            <div className="mt-5 text-xs font-medium text-slate-400">
              {unpaidInstallments.length === 0
                ? "All installments settled"
                : `${unpaidInstallments.length} installment${
                    unpaidInstallments.length > 1 ? "s" : ""
                  } remaining`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* COLLECTION PROGRESS */}
      <Card className="overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm">
        <CardContent className="p-6 md:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                  <TrendingUp className="size-4" />
                </div>

                <div>
                  <p className="text-sm font-black text-slate-900">
                    Collection Progress
                  </p>
                  <p className="text-xs text-slate-500">
                    Payment progress for this academic year
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-end gap-3">
                <span className="text-3xl font-black tracking-tight text-slate-950">
                  {collectionPercentage}%
                </span>

                <span className="mb-1 text-sm font-medium text-slate-400">
                  completed
                </span>
              </div>
            </div>

            <div className="flex-1 lg:max-w-2xl">
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500 transition-all duration-700"
                  style={{ width: `${collectionPercentage}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-600">
                  {money(ledger.summary.paid)} collected
                </span>

                <span className="font-medium text-slate-400">
                  {money(totalPayable)} payable
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 border-t border-slate-100 pt-5 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                Paid
              </p>
              <p className="mt-1.5 font-black text-emerald-600">
                {money(ledger.summary.paid)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                Remaining
              </p>
              <p className="mt-1.5 font-black text-rose-600">
                {money(ledger.summary.outstanding)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                Next Due
              </p>

              <p className="mt-1.5 truncate font-black text-slate-900">
                {nextDueInstallment
                  ? `${money(nextDueInstallment.outstanding)} · ${date(
                      nextDueInstallment.dueDate,
                    )}`
                  : "No pending dues"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* INSTALLMENT LEDGER */}
      <Card className="overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 px-6 py-5 md:px-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                <Banknote className="size-5" />
              </div>

              <div>
                <CardTitle className="text-lg font-black text-slate-950">
                  Installment Ledger
                </CardTitle>

                <p className="mt-0.5 text-xs text-slate-500">
                  {ledger.studentFee.feePlan.name}
                </p>
              </div>
            </div>

            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
              {ledger.installments.length} Installments
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-6 py-4 text-left text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                    Installment
                  </th>

                  <th className="px-6 py-4 text-left text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                    Due Date
                  </th>

                  <th className="px-6 py-4 text-left text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                    Progress
                  </th>

                  <th className="px-6 py-4 text-right text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                    Payable
                  </th>

                  <th className="px-6 py-4 text-right text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                    Paid
                  </th>

                  <th className="px-6 py-4 text-right text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                    Balance
                  </th>

                  <th className="px-6 py-4 text-center text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                    Status
                  </th>

                  <th className="px-6 py-4 text-right text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {ledger.installments.map((installment) => {
                  const status = getStatusBadge(installment.status);
                  const progress = getPaymentProgress(
                    installment.paidAmount,
                    installment.payableAmount,
                  );

                  return (
                    <tr
                      key={installment.id}
                      className="group transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-500">
                            {String(installment.sequence).padStart(2, "0")}
                          </div>

                          <div>
                            <p className="font-bold text-slate-900">
                              {installment.name}
                            </p>

                            <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                              {installment.feeCategory.name}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="font-semibold text-slate-700">
                          {date(installment.dueDate)}
                        </div>

                        {installment.periodStart && installment.periodEnd && (
                          <p className="mt-1 text-[10px] text-slate-400">
                            Billing period
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <div className="min-w-[140px]">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500">
                              {progress}% paid
                            </span>
                          </div>

                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                installment.status === "PAID"
                                  ? "bg-emerald-500"
                                  : installment.status === "PARTIAL"
                                    ? "bg-amber-500"
                                    : installment.status === "WAIVED"
                                      ? "bg-slate-400"
                                      : "bg-rose-400"
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-right">
                        <div className="font-bold text-slate-800">
                          {money(installment.payableAmount)}
                        </div>

                        {installment.concession > 0 && (
                          <p className="mt-1 text-[10px] font-semibold text-indigo-500">
                            − {money(installment.concession)}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-5 text-right font-bold text-emerald-600">
                        {money(installment.paidAmount)}
                      </td>

                      <td className="px-6 py-5 text-right">
                        <span
                          className={`font-black ${
                            installment.outstanding > 0
                              ? "text-rose-600"
                              : "text-slate-400"
                          }`}
                        >
                          {money(installment.outstanding)}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-center">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold tracking-wider uppercase ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-slate-200 bg-white font-semibold text-slate-700 shadow-sm hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                          disabled={installment.status === "PAID"}
                          onClick={() => {
                            setSelectedInstallment(installment);
                            setConcessionOpen(true);
                          }}
                        >
                          <Gift className="mr-1.5 size-3.5" />
                          Concession
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* PAYMENT HISTORY */}
      <Card className="overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 px-6 py-5 md:px-7">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <History className="size-5" />
            </div>

            <div>
              <CardTitle className="text-lg font-black text-slate-950">
                Payment History
              </CardTitle>

              <p className="mt-0.5 text-xs text-slate-500">
                {ledger.payments.length === 0
                  ? "No transactions recorded"
                  : `${ledger.payments.length} recorded transaction${
                      ledger.payments.length > 1 ? "s" : ""
                    }`}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {ledger.payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="flex size-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
                <Receipt className="size-7" />
              </div>

              <h3 className="mt-5 font-black text-slate-900">
                No payments recorded yet
              </h3>

              <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                Once a payment is collected, the receipt and allocation details
                will appear here.
              </p>

              {unpaidInstallments.length > 0 && (
                <Button
                  className="mt-6 rounded-xl bg-slate-950 hover:bg-slate-800"
                  onClick={() => setPaymentOpen(true)}
                >
                  <CreditCard className="mr-2 size-4" />
                  Record First Payment
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-6 py-4 text-left text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                      Receipt
                    </th>

                    <th className="px-6 py-4 text-left text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                      Date
                    </th>

                    <th className="px-6 py-4 text-left text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                      Payment Mode
                    </th>

                    <th className="px-6 py-4 text-left text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                      Allocation
                    </th>

                    <th className="px-6 py-4 text-right text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                      Amount
                    </th>

                    <th className="px-6 py-4 text-right text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                      Receipt
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {ledger.payments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="group transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                            <Receipt className="size-4" />
                          </div>

                          <div>
                            <p className="font-black text-slate-900">
                              {payment.receiptNo}
                            </p>

                            {payment.referenceNo && (
                              <p className="mt-0.5 text-[10px] text-slate-400">
                                Ref: {payment.referenceNo}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <p className="font-semibold text-slate-700">
                          {date(payment.paymentDate)}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-600 uppercase">
                          {payment.paymentMode}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="space-y-1.5">
                          {payment.allocations.map((allocation) => (
                            <div
                              key={allocation.installmentId}
                              className="flex items-center gap-2 text-xs"
                            >
                              <span className="font-semibold text-slate-700">
                                {allocation.installmentName}
                              </span>

                              <span className="text-slate-300">•</span>

                              <span className="font-bold text-emerald-600">
                                {money(allocation.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="px-6 py-5 text-right">
                        <p className="text-lg font-black text-emerald-600">
                          {money(payment.amount)}
                        </p>
                      </td>

                      <td className="px-6 py-5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-slate-200 bg-white font-semibold text-slate-700 shadow-sm hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                          onClick={() =>
                            window.open(
                              `/${params.schoolSlug}/fees/receipts/${payment.id}`,
                              "_blank",
                            )
                          }
                        >
                          <ExternalLink className="mr-1.5 size-3.5" />
                          View
                          <ArrowUpRight className="ml-1 size-3" />
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

      {/* DIALOGS */}
      <ConcessionDialog
        open={concessionOpen}
        onOpenChange={setConcessionOpen}
        installment={selectedInstallment}
        onSuccess={loadLedger}
      />

      <RecordFeePaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        schoolSlug={params.schoolSlug}
        studentFeeId={ledger.studentFee.id}
        studentEnrollmentId={ledger.studentFee.studentEnrollmentId}
        installments={unpaidInstallments}
        onSuccess={loadLedger}
      />
    </div>
  );
}
