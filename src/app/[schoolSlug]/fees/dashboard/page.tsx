"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useParams } from "next/navigation";

type DashboardData = {
  summary: {
    totalAmount: number;
    totalConcession: number;
    totalPayable: number;
    totalPaid: number;
    outstanding: number;
    pendingCount: number;
    partialCount: number;
    paidCount: number;
    waivedCount: number;
    installmentCount: number;
  };

  collection: {
    today: number;
    todayPaymentCount: number;
    thisMonth: number;
    thisMonthPaymentCount: number;
  };

  paymentModes: Record<
    string,
    {
      count: number;
      amount: number;
    }
  >;

  recentPayments: Array<{
    id: string;
    receiptNo: string;
    paymentDate: string;
    amount: number | string;
    paymentMode: string;
    studentEnrollment: {
      student: {
        admissionNo: string;
        fullName: string | null;
      };
      class: {
        name: string;
      };
      section: {
        name: string;
      };
    };
  }>;
};

function money(value: number | string) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function date(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function FeeDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/v1/fees/dashboard");

      const result = await response.json();

      if (!result.success) {
        setError(result.message || "Failed to load fee dashboard.");
        return;
      }

      setData(result.data);
    } catch {
      setError("Failed to load fee dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-sm text-muted-foreground">
          Loading fee dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-destructive">{error}</div>

            <Button className="mt-4" onClick={loadDashboard}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { summary, collection, paymentModes, recentPayments } = data;

  const { schoolSlug } = useParams<{
    schoolSlug: string;
  }>();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}

      <div>
        <h1 className="text-2xl font-semibold">Fee Dashboard</h1>

        <p className="text-sm text-muted-foreground">
          Fee collection and outstanding summary
        </p>
      </div>

      {/* Collection Cards */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Today's Collection
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">{money(collection.today)}</div>

            <p className="text-xs text-muted-foreground">
              {collection.todayPaymentCount} payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {money(collection.thisMonth)}
            </div>

            <p className="text-xs text-muted-foreground">
              {collection.thisMonthPaymentCount} payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Payable</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {money(summary.totalPayable)}
            </div>

            <p className="text-xs text-muted-foreground">After concessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {money(summary.outstanding)}
            </div>

            <p className="text-xs text-muted-foreground">Amount remaining</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary + Payment Modes */}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fee Summary</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Total Fee</span>
              <span className="font-medium">{money(summary.totalAmount)}</span>
            </div>

            <div className="flex justify-between">
              <span>Concession</span>
              <span className="font-medium">
                {money(summary.totalConcession)}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Total Payable</span>
              <span className="font-medium">{money(summary.totalPayable)}</span>
            </div>

            <div className="flex justify-between">
              <span>Total Paid</span>
              <span className="font-medium">{money(summary.totalPaid)}</span>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between">
                <span className="font-semibold">Outstanding</span>

                <span className="font-bold">{money(summary.outstanding)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Modes</CardTitle>
          </CardHeader>

          <CardContent>
            {Object.keys(paymentModes).length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No payments recorded.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(paymentModes).map(([mode, value]) => (
                  <div key={mode} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{mode}</div>

                      <div className="text-xs text-muted-foreground">
                        {value.count} payments
                      </div>
                    </div>

                    <div className="font-semibold">{money(value.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Installment Status */}

      <Card>
        <CardHeader>
          <CardTitle>Installment Status</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold">{summary.pendingCount}</div>

              <div className="text-sm text-muted-foreground">Pending</div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold">{summary.partialCount}</div>

              <div className="text-sm text-muted-foreground">Partial</div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold">{summary.paidCount}</div>

              <div className="text-sm text-muted-foreground">Paid</div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold">{summary.waivedCount}</div>

              <div className="text-sm text-muted-foreground">Waived</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Payments */}

      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>

        <CardContent>
          {recentPayments.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No payments recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-3">Receipt</th>

                    <th className="p-3">Student</th>

                    <th className="p-3">Class</th>

                    <th className="p-3">Date</th>

                    <th className="p-3">Mode</th>

                    <th className="p-3 text-right">Amount</th>

                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {recentPayments.map((payment) => {
                    const student = payment.studentEnrollment.student;

                    const className = payment.studentEnrollment.class.name;

                    const section = payment.studentEnrollment.section.name;

                    return (
                      <tr key={payment.id} className="border-b">
                        <td className="p-3 font-medium">{payment.receiptNo}</td>

                        <td className="p-3">
                          <div>{student.fullName || "—"}</div>

                          <div className="text-xs text-muted-foreground">
                            {student.admissionNo}
                          </div>
                        </td>

                        <td className="p-3">
                          {className} - {section}
                        </td>

                        <td className="p-3">{date(payment.paymentDate)}</td>

                        <td className="p-3">
                          <Badge variant="outline">{payment.paymentMode}</Badge>
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
                                `/${schoolSlug}/fees/receipts/${payment.id}`,
                                "_blank",
                              )
                            }
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Receipt
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
