"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { RecordFeePaymentDialog } from "./RecordFeePaymentDialog";

type PendingFeeRow = {
  id: string;

  installmentName: string;

  dueDate: string;

  status: "PENDING" | "PARTIAL";

  amount: number;
  concession: number;
  payableAmount: number;
  paidAmount: number;
  outstanding: number;

  student: {
    id: string;
    admissionNo: string;
    fullName: string;
  };

  class: {
    id: string;
    name: string;
  };

  section: {
    id: string;
    name: string;
  } | null;

  rollNo: number | null;

  studentFeeId: string;
  studentEnrollmentId: string;
};

type Props = {
  rows: PendingFeeRow[];

  onPaymentSuccess: () => void;
};

export function PendingFeesTable({ rows, onPaymentSuccess }: Props) {
  const [selectedRow, setSelectedRow] = useState<PendingFeeRow | null>(null);

  const [paymentOpen, setPaymentOpen] = useState(false);

  function handleCollect(row: PendingFeeRow) {
    setSelectedRow(row);

    setPaymentOpen(true);
  }

  function handleOpenChange(open: boolean) {
    setPaymentOpen(open);

    if (!open) {
      setSelectedRow(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        No pending fees found.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-3 text-left">Student</th>

              <th className="p-3 text-left">Class</th>

              <th className="p-3 text-left">Installment</th>

              <th className="p-3 text-left">Due Date</th>

              <th className="p-3 text-right">Payable</th>

              <th className="p-3 text-right">Paid</th>

              <th className="p-3 text-right">Outstanding</th>

              <th className="p-3 text-center">Status</th>

              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-b-0">
                <td className="p-3">
                  <div className="font-medium">{row.student.fullName}</div>

                  <div className="text-xs text-muted-foreground">
                    {row.student.admissionNo}
                  </div>
                </td>

                <td className="p-3">
                  {row.class.name}
                  {row.section ? ` - ${row.section.name}` : ""}
                </td>

                <td className="p-3">{row.installmentName}</td>

                <td className="p-3">
                  {new Date(row.dueDate).toLocaleDateString("en-IN")}
                </td>

                <td className="p-3 text-right">
                  ₹{row.payableAmount.toLocaleString("en-IN")}
                </td>

                <td className="p-3 text-right">
                  ₹{row.paidAmount.toLocaleString("en-IN")}
                </td>

                <td className="p-3 text-right font-semibold">
                  ₹{row.outstanding.toLocaleString("en-IN")}
                </td>

                <td className="p-3 text-center">
                  <span className="rounded-full border px-2 py-1 text-xs">
                    {row.status}
                  </span>
                </td>

                <td className="p-3 text-center">
                  <Button size="sm" onClick={() => handleCollect(row)}>
                    Collect
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRow && (
        <RecordFeePaymentDialog
          open={paymentOpen}
          onOpenChange={handleOpenChange}
          studentFeeId={selectedRow.studentFeeId}
          studentEnrollmentId={selectedRow.studentEnrollmentId}
          installments={[
            {
              id: selectedRow.id,
              name: selectedRow.installmentName,
              payableAmount: selectedRow.payableAmount,
              paidAmount: selectedRow.paidAmount,
              outstanding: selectedRow.outstanding,
            },
          ]}
          onSuccess={onPaymentSuccess}
        />
      )}
    </>
  );
}
