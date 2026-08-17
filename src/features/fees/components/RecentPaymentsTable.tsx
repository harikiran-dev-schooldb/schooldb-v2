"use client";

import { ExternalLink } from "lucide-react";
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

export function RecentPaymentsTable({ payments }: Props) {
  const { schoolSlug } = useParams<{
    schoolSlug: string;
  }>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Payments</CardTitle>
      </CardHeader>

      <CardContent>
        {payments.length === 0 ? (
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
                {payments.map((payment) => {
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

                      <td className="p-3">{formatDate(payment.paymentDate)}</td>

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
  );
}
