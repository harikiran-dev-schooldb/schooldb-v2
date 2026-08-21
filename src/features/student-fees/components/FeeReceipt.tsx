"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  CreditCard,
  FileText,
  GraduationCap,
  Hash,
  Printer,
  Receipt,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type Allocation = {
  installmentId: string;
  installmentName: string;
  feeCategory: string;
  amount: number;
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

  school: {
    id: string;
    name: string;
  };

  student: {
    id: string;
    fullName: string | null;
    admissionNo: string;
    class: string;
    section: string;
    academicYear: string;
  };

  allocations: Allocation[];
};

type Props = {
  paymentId: string;
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function numberToWords(amount: number) {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function convert(n: number): string {
    if (n < 20) return ones[n];

    if (n < 100) {
      return tens[Math.floor(n / 10)] + (n % 10 ? ` ${ones[n % 10]}` : "");
    }

    if (n < 1000) {
      return (
        `${ones[Math.floor(n / 100)]} Hundred` +
        (n % 100 ? ` ${convert(n % 100)}` : "")
      );
    }

    if (n < 100000) {
      return (
        `${convert(Math.floor(n / 1000))} Thousand` +
        (n % 1000 ? ` ${convert(n % 1000)}` : "")
      );
    }

    if (n < 10000000) {
      return (
        `${convert(Math.floor(n / 100000))} Lakh` +
        (n % 100000 ? ` ${convert(n % 100000)}` : "")
      );
    }

    return (
      `${convert(Math.floor(n / 10000000))} Crore` +
      (n % 10000000 ? ` ${convert(n % 10000000)}` : "")
    );
  }

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  if (rupees === 0 && paise === 0) {
    return "Zero Rupees Only";
  }

  let result = rupees > 0 ? `${convert(rupees)} Rupees` : "";

  if (paise > 0) {
    result += `${result ? " and " : ""}${convert(paise)} Paise`;
  }

  return `${result} Only`;
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 text-slate-400" />
        <p className="text-[9px] font-bold tracking-[0.14em] text-slate-400 uppercase">
          {label}
        </p>
      </div>

      <p className="mt-1.5 truncate text-sm font-bold text-slate-900">
        {value || "-"}
      </p>
    </div>
  );
}

export function FeeReceipt({ paymentId }: Props) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/v1/fee-payments/${paymentId}`, {
          cache: "no-store",
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || "Failed to load receipt.");
        }

        setPayment(result.data);
      } catch (error) {
        console.error(error);
        setPayment(null);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [paymentId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-3xl space-y-5">
          <div className="h-16 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-[700px] animate-pulse rounded-[2rem] bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-rose-50">
            <Receipt className="size-7 text-rose-500" />
          </div>

          <h2 className="mt-5 text-xl font-black text-slate-900">
            Receipt Not Found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            We couldn&apos;t retrieve this payment receipt.
          </p>
        </div>
      </div>
    );
  }

  const studentInitial =
    payment.student.fullName?.charAt(0).toUpperCase() || "S";

  return (
    <>
      {/* TOP ACTION BAR */}
      <div className="print:hidden sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-slate-400 uppercase">
              SchoolDB Finance
            </p>

            <p className="mt-1 font-black text-slate-900">Payment Receipt</p>
          </div>

          <Button
            onClick={() => window.print()}
            className="rounded-xl bg-slate-950 px-5 shadow-lg shadow-slate-900/15 hover:bg-slate-800"
          >
            <Printer className="mr-2 size-4" />
            Print Receipt
          </Button>
        </div>
      </div>

      <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-6 md:py-10 print:bg-white print:p-0">
        <div
          id="fee-receipt"
          className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/50 print:max-w-none print:rounded-none print:border-0 print:shadow-none"
        >
          {/* PREMIUM HEADER */}
          <div className="relative overflow-hidden bg-slate-950 px-6 py-7 text-white md:px-10 md:py-9">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute -right-16 -top-16 size-64 rounded-full bg-teal-400 blur-3xl" />
              <div className="absolute -bottom-24 left-1/4 size-64 rounded-full bg-indigo-500 blur-3xl" />
            </div>

            <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                    <GraduationCap className="size-6 text-teal-300" />
                  </div>

                  <div>
                    <p className="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                      Official Fee Receipt
                    </p>

                    <h1 className="mt-1 text-xl font-black tracking-tight md:text-2xl">
                      {payment.school.name}
                    </h1>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 text-xs text-slate-300">
                  <BadgeCheck className="size-4 text-emerald-400" />
                  Payment successfully recorded
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm md:min-w-[220px]">
                <p className="text-[9px] font-bold tracking-[0.16em] text-slate-400 uppercase">
                  Receipt Number
                </p>

                <p className="mt-1.5 text-lg font-black tracking-wide">
                  {payment.receiptNo}
                </p>

                <div className="mt-3 border-t border-white/10 pt-3">
                  <p className="text-[9px] font-bold tracking-[0.16em] text-slate-400 uppercase">
                    Payment Date
                  </p>

                  <p className="mt-1 text-sm font-bold">
                    {formatDate(payment.paymentDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-10">
            {/* STUDENT PROFILE */}
            <section>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                  <UserRound className="size-4" />
                </div>

                <div>
                  <h2 className="text-base font-black text-slate-950">
                    Student Details
                  </h2>

                  <p className="text-xs text-slate-500">
                    Academic and enrollment information
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 md:flex-row md:items-center">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-xl font-black text-white shadow-lg shadow-teal-500/20">
                  {studentInitial}
                </div>

                <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <InfoItem
                    icon={UserRound}
                    label="Student Name"
                    value={payment.student.fullName || "-"}
                  />

                  <InfoItem
                    icon={Hash}
                    label="Admission No."
                    value={payment.student.admissionNo}
                  />

                  <InfoItem
                    icon={GraduationCap}
                    label="Class & Section"
                    value={`${payment.student.class} · ${payment.student.section}`}
                  />

                  <InfoItem
                    icon={CalendarDays}
                    label="Academic Year"
                    value={payment.student.academicYear}
                  />
                </div>
              </div>
            </section>

            {/* PAYMENT ALLOCATIONS */}
            <section className="mt-8">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <FileText className="size-4" />
                  </div>

                  <div>
                    <h2 className="text-base font-black text-slate-950">
                      Payment Breakdown
                    </h2>

                    <p className="text-xs text-slate-500">
                      Fee allocation details
                    </p>
                  </div>
                </div>

                <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  {payment.allocations.length} Allocation
                  {payment.allocations.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3.5 text-left text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                        Fee Category
                      </th>

                      <th className="px-4 py-3.5 text-left text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                        Installment
                      </th>

                      <th className="px-4 py-3.5 text-right text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                        Amount Paid
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {payment.allocations.map((allocation) => (
                      <tr key={allocation.installmentId}>
                        <td className="px-4 py-4 font-semibold text-slate-700">
                          {allocation.feeCategory}
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {allocation.installmentName}
                        </td>

                        <td className="px-4 py-4 text-right font-black text-slate-900">
                          {money(allocation.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-emerald-50/70">
                      <td
                        colSpan={2}
                        className="px-4 py-4 text-right text-sm font-bold text-slate-600"
                      >
                        Total Amount Paid
                      </td>

                      <td className="px-4 py-4 text-right text-xl font-black text-emerald-600">
                        {money(payment.amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* AMOUNT IN WORDS */}
            <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
              <p className="text-[9px] font-bold tracking-[0.16em] text-indigo-400 uppercase">
                Amount in Words
              </p>

              <p className="mt-2 text-sm font-bold leading-6 text-indigo-950">
                {numberToWords(payment.amount)}
              </p>
            </div>

            {/* PAYMENT INFORMATION */}
            <section className="mt-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CreditCard className="size-4" />
                </div>

                <div>
                  <h2 className="text-base font-black text-slate-950">
                    Payment Information
                  </h2>

                  <p className="text-xs text-slate-500">Transaction details</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoItem
                  icon={CreditCard}
                  label="Payment Mode"
                  value={payment.paymentMode}
                />

                <InfoItem
                  icon={Hash}
                  label="Reference Number"
                  value={payment.referenceNo || "-"}
                />
              </div>

              {payment.remarks && (
                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[9px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                    Remarks
                  </p>

                  <p className="mt-1.5 text-sm font-medium leading-6 text-slate-700">
                    {payment.remarks}
                  </p>
                </div>
              )}
            </section>

            {/* FOOTER */}
            <div className="mt-12 border-t border-slate-200 pt-6">
              <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <BadgeCheck className="size-4 text-emerald-500" />
                    Thank you for your payment.
                  </div>

                  <p className="mt-2 max-w-md text-xs leading-5 text-slate-400">
                    This is a computer-generated payment receipt issued through
                    the SchoolDB School Management System.
                  </p>
                </div>

                <div className="min-w-[180px] text-center">
                  <div className="h-10 border-b border-slate-300" />

                  <p className="mt-2 text-[10px] font-bold tracking-[0.12em] text-slate-500 uppercase">
                    Authorized Signature
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }

          html,
          body {
            background: white !important;
          }

          body * {
            visibility: hidden;
          }

          #fee-receipt,
          #fee-receipt * {
            visibility: visible;
          }

          #fee-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          #fee-receipt table {
            break-inside: avoid;
          }

          #fee-receipt section {
            break-inside: avoid;
          }
        }
      `}</style>
    </>
  );
}
