"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";

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
    if (n < 20) {
      return ones[n];
    }

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

  if (rupees === 0) {
    return "Zero Rupees Only";
  }

  return `${convert(rupees)} Rupees Only`;
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
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [paymentId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading receipt...
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Receipt not found.
      </div>
    );
  }

  return (
    <>
      <div className="print:hidden flex justify-end p-6">
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print Receipt
        </Button>
      </div>

      <main className="mx-auto max-w-3xl px-6 pb-10">
        <div
          id="fee-receipt"
          className="rounded-lg border bg-white p-8 text-black shadow-sm print:border-0 print:p-0 print:shadow-none"
        >
          {/* Header */}

          <div className="border-b pb-5 text-center">
            <h1 className="text-2xl font-bold uppercase">
              {payment.school.name}
            </h1>

            <p className="mt-1 text-sm">Fee Payment Receipt</p>

            <div className="mt-4 flex justify-between text-sm">
              <div>
                <span className="font-semibold">Receipt No:</span>{" "}
                {payment.receiptNo}
              </div>

              <div>
                <span className="font-semibold">Date:</span>{" "}
                {formatDate(payment.paymentDate)}
              </div>
            </div>
          </div>

          {/* Student */}

          <div className="grid grid-cols-2 gap-4 border-b py-5 text-sm">
            <div>
              <p className="text-muted-foreground">Student Name</p>

              <p className="font-semibold">{payment.student.fullName || "-"}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Admission No</p>

              <p className="font-semibold">{payment.student.admissionNo}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Class</p>

              <p className="font-semibold">
                {payment.student.class} - {payment.student.section}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground">Academic Year</p>

              <p className="font-semibold">{payment.student.academicYear}</p>
            </div>
          </div>

          {/* Payment Details */}

          <div className="py-5">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left">Fee Category</th>

                  <th className="p-3 text-left">Installment</th>

                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>

              <tbody>
                {payment.allocations.map((allocation) => (
                  <tr key={allocation.installmentId} className="border-b">
                    <td className="p-3">{allocation.feeCategory}</td>

                    <td className="p-3">{allocation.installmentName}</td>

                    <td className="p-3 text-right">
                      {money(allocation.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr>
                  <td colSpan={2} className="p-3 text-right font-bold">
                    Total Paid
                  </td>

                  <td className="p-3 text-right text-lg font-bold">
                    {money(payment.amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment Information */}

          <div className="grid grid-cols-2 gap-4 border-y py-5 text-sm">
            <div>
              <span className="text-muted-foreground">Payment Mode</span>

              <p className="font-semibold">{payment.paymentMode}</p>
            </div>

            <div>
              <span className="text-muted-foreground">Reference No</span>

              <p className="font-semibold">{payment.referenceNo || "-"}</p>
            </div>

            <div className="col-span-2">
              <span className="text-muted-foreground">Amount in Words</span>

              <p className="font-semibold">{numberToWords(payment.amount)}</p>
            </div>

            {payment.remarks && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Remarks</span>

                <p>{payment.remarks}</p>
              </div>
            )}
          </div>

          {/* Footer */}

          <div className="mt-16 flex justify-between text-sm">
            <div>
              <p>Thank you for your payment.</p>
            </div>

            <div className="text-center">
              <div className="mb-2 h-10 w-40 border-b" />
              <p>Authorized Signature</p>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }

          body {
            background: white !important;
          }
        }
      `}</style>
    </>
  );
}
