"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, ExternalLink, Receipt, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { RecordFeePaymentDialog } from "./RecordFeePaymentDialog";
import { useParams } from "next/navigation";

import { ConcessionDialog } from "./ConcessionDialog";

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

function statusVariant(status: Installment["status"]) {
  switch (status) {
    case "PAID":
      return "default" as const;

    case "PARTIAL":
      return "secondary" as const;

    case "WAIVED":
      return "outline" as const;

    default:
      return "destructive" as const;
  }
}

export function StudentFeeLedger({ studentFeeId }: Props) {
  const [ledger, setLedger] = useState<Ledger | null>(null);

  const [loading, setLoading] = useState(true);

  const [paymentOpen, setPaymentOpen] = useState(false);

  const params = useParams<{
    schoolSlug: string;
  }>();

  const [concessionOpen, setConcessionOpen] = useState(false);

  const [selectedInstallment, setSelectedInstallment] =
    useState<Installment | null>(null);

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
    } finally {
      setLoading(false);
    }
  }, [studentFeeId]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        Loading fee ledger...
      </div>
    );
  }

  if (!ledger) {
    return (
      <div className="rounded-md border p-6 text-center">
        Fee ledger not found.
      </div>
    );
  }

  const unpaidInstallments = ledger.installments.filter(
    (item) => item.status === "PENDING" || item.status === "PARTIAL",
  );

  return (
    <div className="space-y-6">
      {/* Student Header */}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-semibold">
                {ledger.student.fullName || "Student"}
              </h1>

              <p className="text-sm text-muted-foreground">
                Admission No: {ledger.student.admissionNo}
              </p>

              <p className="text-sm text-muted-foreground">
                {ledger.student.class.name} • Section{" "}
                {ledger.student.section.name}
              </p>

              <p className="text-sm text-muted-foreground">
                Academic Year: {ledger.academicYear.name}
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={loadLedger} disabled={loading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>

              <Button
                disabled={unpaidInstallments.length === 0}
                onClick={() => setPaymentOpen(true)}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Record Payment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Fee
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {money(ledger.summary.total)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Concession
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {money(ledger.summary.concession)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {money(ledger.summary.paid)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {money(ledger.summary.outstanding)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fee Plan */}

      <Card>
        <CardHeader>
          <CardTitle>{ledger.studentFee.feePlan.name}</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3">Installment</th>

                  <th className="p-3">Due Date</th>

                  <th className="p-3 text-right">Amount</th>

                  <th className="p-3 text-right">Concession</th>

                  <th className="p-3 text-right">Paid</th>

                  <th className="p-3 text-right">Balance</th>

                  <th className="p-3">Status</th>

                  <th className="p-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {ledger.installments.map((installment) => (
                  <tr key={installment.id} className="border-b">
                    <td className="p-3">
                      <div className="font-medium">{installment.name}</div>

                      <div className="text-xs text-muted-foreground">
                        {installment.feeCategory.name}
                      </div>
                    </td>

                    <td className="p-3">{date(installment.dueDate)}</td>

                    <td className="p-3 text-right">
                      {money(installment.payableAmount)}
                    </td>

                    <td className="p-3 text-right">
                      {money(installment.concession)}
                    </td>

                    <td className="p-3 text-right">
                      {money(installment.paidAmount)}
                    </td>

                    <td className="p-3 text-right font-medium">
                      {money(installment.outstanding)}
                    </td>

                    <td className="p-3">
                      <Badge variant={statusVariant(installment.status)}>
                        {installment.status}
                      </Badge>
                    </td>

                    <td className="p-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedInstallment(installment);
                          setConcessionOpen(true);
                        }}
                      >
                        Concession
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>

        <CardContent>
          {ledger.payments.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No payments recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-3">Receipt No</th>

                    <th className="p-3">Date</th>

                    <th className="p-3">Mode</th>

                    <th className="p-3">Allocation</th>

                    <th className="p-3 text-right">Amount</th>

                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {ledger.payments.map((payment) => (
                    <tr key={payment.id} className="border-b">
                      <td className="p-3 font-medium">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4" />

                          {payment.receiptNo}
                        </div>
                      </td>

                      <td className="p-3">{date(payment.paymentDate)}</td>

                      <td className="p-3">{payment.paymentMode}</td>

                      <td className="p-3">
                        <div className="space-y-1">
                          {payment.allocations.map((allocation) => (
                            <div
                              key={allocation.installmentId}
                              className="text-xs"
                            >
                              {allocation.installmentName} —{" "}
                              {money(allocation.amount)}
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="p-3 text-right font-medium">
                        {money(payment.amount)}
                      </td>

                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(
                              `/${params.schoolSlug}/fees/receipts/${payment.id}`,
                              "_blank",
                            )
                          }
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
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

      <ConcessionDialog
        open={concessionOpen}
        onOpenChange={setConcessionOpen}
        installment={selectedInstallment}
        onSuccess={loadLedger}
      />

      <RecordFeePaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        studentFeeId={ledger.studentFee.id}
        studentEnrollmentId={ledger.studentFee.studentEnrollmentId}
        installments={unpaidInstallments}
        onSuccess={loadLedger}
      />
    </div>
  );
}
