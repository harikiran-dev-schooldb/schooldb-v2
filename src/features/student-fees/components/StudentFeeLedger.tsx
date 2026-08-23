"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

/* ========================================================================== */
/* TYPES                                                                      */
/* ========================================================================== */

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

type PaymentAllocation = {
  installmentId: string;
  installmentName: string;
  amount: number;
  feeCategory: string;
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

  allocations: PaymentAllocation[];
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

type CombinedInstallment = Installment & {
  feePlanId: string;
  feePlanName: string;
  studentFeeId: string;
  studentEnrollmentId: string;
};

type CombinedPayment = Payment & {
  studentFeeId: string;
  feePlanName: string;
};

type Props = {
  studentFeeIds: string[];
};

/* ========================================================================== */
/* HELPERS                                                                    */
/* ========================================================================== */

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

/* ========================================================================== */
/* COMPONENT                                                                  */
/* ========================================================================== */

export function StudentFeeLedger({ studentFeeIds }: Props) {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);

  const [paymentOpen, setPaymentOpen] = useState(false);

  const [concessionOpen, setConcessionOpen] = useState(false);

  const [selectedInstallment, setSelectedInstallment] =
    useState<CombinedInstallment | null>(null);

  const [selectedPaymentLedger, setSelectedPaymentLedger] =
    useState<Ledger | null>(null);

  const params = useParams<{ schoolSlug: string }>();

  /* ====================================================================== */
  /* LOAD ALL LEDGERS                                                       */
  /* ====================================================================== */

  const loadLedgers = useCallback(async () => {
    if (studentFeeIds.length === 0) {
      setLedgers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const results = await Promise.all(
        studentFeeIds.map(async (studentFeeId) => {
          const response = await fetch(
            `/api/v1/student-fees/${studentFeeId}/ledger`,
            {
              cache: "no-store",
            },
          );

          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(
              result.message ||
                `Failed to load fee ledger for ${studentFeeId}.`,
            );
          }

          return result.data as Ledger;
        }),
      );

      setLedgers(results);
    } catch (error) {
      console.error("Failed to load student fee ledgers:", error);
      setLedgers([]);
    } finally {
      setLoading(false);
    }
  }, [studentFeeIds]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadLedgers();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadLedgers]);

  /* ====================================================================== */
  /* COMBINED INSTALLMENTS                                                  */
  /* ====================================================================== */

  const installments = useMemo<CombinedInstallment[]>(() => {
    return ledgers
      .flatMap((ledger) =>
        ledger.installments.map((installment) => ({
          ...installment,

          feePlanId: ledger.studentFee.feePlan.id,

          feePlanName: ledger.studentFee.feePlan.name,

          studentFeeId: ledger.studentFee.id,

          studentEnrollmentId: ledger.studentFee.studentEnrollmentId,
        })),
      )
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      );
  }, [ledgers]);

  /* ====================================================================== */
  /* COMBINED PAYMENTS                                                      */
  /* ====================================================================== */

  const payments = useMemo<CombinedPayment[]>(() => {
    return ledgers
      .flatMap((ledger) =>
        ledger.payments.map((payment) => ({
          ...payment,

          studentFeeId: ledger.studentFee.id,

          feePlanName: ledger.studentFee.feePlan.name,
        })),
      )
      .sort(
        (a, b) =>
          new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
      );
  }, [ledgers]);

  /* ====================================================================== */
  /* COMBINED STUDENT                                                       */
  /* ====================================================================== */

  const student = ledgers[0]?.student ?? null;

  const academicYear = ledgers[0]?.academicYear ?? null;

  /* ====================================================================== */
  /* COMBINED SUMMARY                                                        */
  /* ====================================================================== */

  const summary = useMemo(() => {
    return ledgers.reduce(
      (total, ledger) => ({
        total: total.total + ledger.summary.total,
        concession: total.concession + ledger.summary.concession,
        paid: total.paid + ledger.summary.paid,
        outstanding: total.outstanding + ledger.summary.outstanding,
      }),
      {
        total: 0,
        concession: 0,
        paid: 0,
        outstanding: 0,
      },
    );
  }, [ledgers]);

  /* ====================================================================== */
  /* UNPAID INSTALLMENTS                                                    */
  /* ====================================================================== */

  const unpaidInstallments = useMemo(
    () =>
      installments.filter(
        (item) => item.status === "PENDING" || item.status === "PARTIAL",
      ),
    [installments],
  );

  /* ====================================================================== */
  /* COLLECTION                                                             */
  /* ====================================================================== */

  const totalPayable = Math.max(summary.total - summary.concession, 0);

  const collectionPercentage =
    totalPayable > 0
      ? Math.min(Math.round((summary.paid / totalPayable) * 100), 100)
      : 0;

  /* ====================================================================== */
  /* NEXT DUE                                                               */
  /* ====================================================================== */

  const nextDueInstallment = unpaidInstallments[0] ?? null;

  /* ====================================================================== */
  /* STUDENT INITIAL                                                        */
  /* ====================================================================== */

  const studentInitial = student?.fullName?.charAt(0).toUpperCase() || "S";

  /* ====================================================================== */
  /* RECORD PAYMENT                                                         */
  /* ====================================================================== */

  function openPaymentDialog() {
    if (ledgers.length === 0) return;

    /*
     * If there is only one fee plan, use it directly.
     *
     * If there are multiple fee plans, we currently open the first
     * ledger's payment dialog. The installment list remains consolidated
     * in the main table.
     *
     * This preserves the existing payment API contract, which expects
     * a single studentFeeId.
     */
    const ledger =
      ledgers.find((item) =>
        item.installments.some(
          (installment) =>
            installment.status === "PENDING" ||
            installment.status === "PARTIAL",
        ),
      ) ?? ledgers[0];

    if (!ledger) return;

    setSelectedPaymentLedger(ledger);
    setPaymentOpen(true);
  }

  const studentEnrollmentId = ledgers[0]?.studentFee.studentEnrollmentId;

  /* ====================================================================== */
  /* LOADING                                                                */
  /* ====================================================================== */

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

  /* ====================================================================== */
  /* EMPTY / ERROR                                                          */
  /* ====================================================================== */

  if (!student || ledgers.length === 0) {
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
          </p>

          <Button
            variant="outline"
            className="mt-6 rounded-xl"
            onClick={() => void loadLedgers()}
          >
            <RefreshCw className="mr-2 size-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* ====================================================================== */
  /* UI                                                                      */
  /* ====================================================================== */

  return (
    <div className="space-y-6 pb-8">
      {/* ================================================================== */}
      {/* STUDENT FINANCIAL HERO                                             */}
      {/* ================================================================== */}

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
                      {student.fullName || "Student"}
                    </h1>
                  </div>

                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase shadow-sm">
                    {ledgers.length} Fee Plan
                    {ledgers.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700">
                    <UserRound className="size-3.5 text-slate-400" />
                    {student.admissionNo}
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700">
                    <GraduationCap className="size-3.5 text-slate-400" />
                    {student.class.name} · Sec {student.section.name}
                  </span>

                  {academicYear && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700">
                      <CalendarDays className="size-3.5 text-slate-400" />
                      {academicYear.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
              <Button
                variant="outline"
                className="rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50"
                onClick={() => void loadLedgers()}
                disabled={loading}
              >
                <RefreshCw className="mr-2 size-4" />
                Refresh
              </Button>

              <Button
                disabled={unpaidInstallments.length === 0}
                onClick={openPaymentDialog}
                className="rounded-xl bg-slate-950 px-5 shadow-lg shadow-slate-900/15 transition-all hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <CreditCard className="mr-2 size-4" />
                Record Payment
              </Button>
            </div>
          </div>

          {/* FEE PLAN SUMMARY */}

          <div className="mt-8 border-t border-slate-100 pt-6">
            <p className="mb-4 text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">
              Assigned Fee Plans
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ledgers.map((ledger) => (
                <div
                  key={ledger.studentFee.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900">
                        {ledger.studentFee.feePlan.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {ledger.installments.length} installment
                        {ledger.installments.length !== 1 ? "s" : ""}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 text-sm font-black ${
                        ledger.summary.outstanding > 0
                          ? "text-rose-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {money(ledger.summary.outstanding)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* FINANCIAL SUMMARY                                                  */}
      {/* ================================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="group overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">
                  Total Fee
                </p>

                <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                  {money(summary.total)}
                </p>
              </div>

              <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Wallet className="size-5" />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs font-medium text-slate-400">
              <Banknote className="size-3.5" />
              All assigned fee plans
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
                  {money(summary.concession)}
                </p>
              </div>

              <div className="flex size-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Gift className="size-5" />
              </div>
            </div>

            <div className="mt-5 text-xs font-medium text-slate-400">
              Total fee reduction
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
                  {money(summary.paid)}
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
                  {money(summary.outstanding)}
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

      {/* ================================================================== */}
      {/* COLLECTION PROGRESS                                               */}
      {/* ================================================================== */}

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
                    Combined payment progress across all fee plans
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
                  style={{
                    width: `${collectionPercentage}%`,
                  }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-600">
                  {money(summary.paid)} collected
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
                {money(summary.paid)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                Remaining
              </p>

              <p className="mt-1.5 font-black text-rose-600">
                {money(summary.outstanding)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                Next Due
              </p>

              <p className="mt-1.5 truncate font-black text-slate-900">
                {nextDueInstallment
                  ? `${nextDueInstallment.feePlanName} · ${money(
                      nextDueInstallment.outstanding,
                    )} · ${date(nextDueInstallment.dueDate)}`
                  : "No pending dues"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* CONSOLIDATED INSTALLMENT LEDGER                                   */}
      {/* ================================================================== */}

      <Card className="overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 px-6 py-5 md:px-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                <Banknote className="size-5" />
              </div>

              <div>
                <CardTitle className="text-lg font-black text-slate-950">
                  Fee Ledger
                </CardTitle>

                <p className="mt-0.5 text-xs text-slate-500">
                  All fee plans and installments
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
                {ledgers.length} Plan
                {ledgers.length > 1 ? "s" : ""}
              </span>

              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
                {installments.length} Installment
                {installments.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-6 py-4 text-left text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                    Fee Plan
                  </th>

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
                {installments.map((installment) => {
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
                      {/* FEE PLAN */}

                      <td className="px-6 py-5">
                        <div className="max-w-[190px]">
                          <p className="font-bold text-slate-900">
                            {installment.feePlanName}
                          </p>

                          <p className="mt-1 text-[10px] font-medium text-slate-400">
                            {installment.feeCategory.name}
                          </p>
                        </div>
                      </td>

                      {/* INSTALLMENT */}

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-500">
                            {String(installment.sequence).padStart(2, "0")}
                          </div>

                          <div>
                            <p className="font-bold text-slate-900">
                              {installment.name}
                            </p>

                            {installment.feeCategory.code && (
                              <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                                {installment.feeCategory.code}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* DUE DATE */}

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

                      {/* PROGRESS */}

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
                              style={{
                                width: `${progress}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* PAYABLE */}

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

                      {/* PAID */}

                      <td className="px-6 py-5 text-right font-bold text-emerald-600">
                        {money(installment.paidAmount)}
                      </td>

                      {/* BALANCE */}

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

                      {/* STATUS */}

                      <td className="px-6 py-5 text-center">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold tracking-wider uppercase ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      {/* ACTION */}

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

              {/* TOTAL */}

              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td
                    colSpan={4}
                    className="px-6 py-5 text-right text-xs font-black tracking-wider text-slate-500 uppercase"
                  >
                    Consolidated Total
                  </td>

                  <td className="px-6 py-5 text-right font-black text-slate-900">
                    {money(totalPayable)}
                  </td>

                  <td className="px-6 py-5 text-right font-black text-emerald-600">
                    {money(summary.paid)}
                  </td>

                  <td className="px-6 py-5 text-right font-black text-rose-600">
                    {money(summary.outstanding)}
                  </td>

                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* PAYMENT HISTORY                                                    */}
      {/* ================================================================== */}

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
                {payments.length === 0
                  ? "No transactions recorded"
                  : `${payments.length} recorded transaction${
                      payments.length > 1 ? "s" : ""
                    } across all fee plans`}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {payments.length === 0 ? (
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
                  onClick={openPaymentDialog}
                >
                  <CreditCard className="mr-2 size-4" />
                  Record First Payment
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-6 py-4 text-left text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                      Receipt
                    </th>

                    <th className="px-6 py-4 text-left text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                      Fee Plan
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
                  {payments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="group transition-colors hover:bg-slate-50/80"
                    >
                      {/* RECEIPT */}

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

                      {/* FEE PLAN */}

                      <td className="px-6 py-5">
                        <span className="font-semibold text-slate-700">
                          {payment.feePlanName}
                        </span>
                      </td>

                      {/* DATE */}

                      <td className="px-6 py-5">
                        <p className="font-semibold text-slate-700">
                          {date(payment.paymentDate)}
                        </p>
                      </td>

                      {/* PAYMENT MODE */}

                      <td className="px-6 py-5">
                        <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-600 uppercase">
                          {payment.paymentMode}
                        </span>
                      </td>

                      {/* ALLOCATION */}

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

                      {/* AMOUNT */}

                      <td className="px-6 py-5 text-right">
                        <p className="text-lg font-black text-emerald-600">
                          {money(payment.amount)}
                        </p>
                      </td>

                      {/* RECEIPT */}

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

      {/* ================================================================== */}
      {/* CONCESSION DIALOG                                                  */}
      {/* ================================================================== */}

      <ConcessionDialog
        open={concessionOpen}
        onOpenChange={setConcessionOpen}
        installment={selectedInstallment}
        onSuccess={loadLedgers}
      />

      {/* ================================================================== */}
      {/* PAYMENT DIALOG                                                     */}
      {/* ================================================================== */}

      {selectedPaymentLedger && (
        <RecordFeePaymentDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          schoolSlug={params.schoolSlug}
          studentEnrollmentId={studentEnrollmentId}
          installments={unpaidInstallments}
          onSuccess={loadLedgers}
        />
      )}
    </div>
  );
}
