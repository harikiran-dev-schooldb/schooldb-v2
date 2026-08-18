"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { OutstandingRow } from "@/features/student-fees/types/outstanding-fees";

type Props = {
  rows: OutstandingRow[];
  onCollect: (row: OutstandingRow) => void;
};

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function OutstandingFeesTable({ rows, onCollect }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Outstanding Installments</CardTitle>
      </CardHeader>

      <CardContent>
        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No outstanding fees found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3">Student</th>
                  <th className="p-3">Class</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Installment</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3 text-right">Payable</th>
                  <th className="p-3 text-right">Paid</th>
                  <th className="p-3 text-right">Outstanding</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-3">
                      <div className="font-medium">
                        {row.student.fullName || "—"}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {row.student.admissionNo}
                      </div>
                    </td>

                    <td className="p-3">
                      {row.class.name} - {row.section.name}
                    </td>

                    <td className="p-3">{row.feeCategory.name}</td>

                    <td className="p-3">{row.installmentName}</td>

                    <td className="p-3">{formatDate(row.dueDate)}</td>

                    <td className="p-3 text-right">
                      {money(row.payableAmount)}
                    </td>

                    <td className="p-3 text-right">{money(row.paidAmount)}</td>

                    <td className="p-3 text-right font-semibold">
                      {money(row.outstanding)}
                    </td>

                    <td className="p-3">
                      <Badge
                        variant={
                          row.status === "PARTIAL" ? "secondary" : "outline"
                        }
                      >
                        {row.status}
                      </Badge>
                    </td>

                    <td className="p-3 text-right">
                      <Button size="sm" onClick={() => onCollect(row)}>
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
