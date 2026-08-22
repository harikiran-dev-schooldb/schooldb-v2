"use client";

import {
  ArrowLeftRight,
  GraduationCap,
  ReceiptIndianRupee,
  WalletCards,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Installment = {
  id: string;
  name: string;
  payableAmount: number;
  paidAmount: number;
  outstanding: number;
  status: "PAID" | "PENDING" | "PARTIAL";
};

type Student = {
  id: string;
  admissionNo: string;
  fullName: string | null;
  className: string | null;
  sectionName: string | null;
};

type Props = {
  student: Student;
  installments: Installment[];
  onChangeStudent: () => void;
};

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export function SelectedStudentCard({
  student,
  installments,
  onChangeStudent,
}: Props) {
  const totalPayable = installments.reduce(
    (total, installment) => total + installment.payableAmount,
    0,
  );

  const totalPaid = installments.reduce(
    (total, installment) => total + installment.paidAmount,
    0,
  );

  const totalOutstanding = installments.reduce(
    (total, installment) => total + installment.outstanding,
    0,
  );

  return (
    <Card className="overflow-hidden rounded-3xl border-border/60 shadow-sm">
      <CardContent className="p-0">
        {/* Student details */}
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <GraduationCap className="size-6 text-primary" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Selected Student
              </p>

              <h2 className="mt-1 truncate text-xl font-bold text-foreground">
                {student.fullName || "Unnamed Student"}
              </h2>

              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span>Adm. No: {student.admissionNo}</span>

                <span className="hidden text-border sm:inline">•</span>

                <span>
                  {student.className || "No Class"}
                  {student.sectionName ? ` · ${student.sectionName}` : ""}
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={onChangeStudent}
            className="rounded-xl sm:self-center"
          >
            <ArrowLeftRight className="mr-2 size-4" />
            Change Student
          </Button>
        </div>

        {/* Fee summary */}
        <div className="grid border-t border-border/60 sm:grid-cols-3">
          {/* Total Payable */}
          <div className="flex items-center gap-3 border-b border-border/60 p-5 sm:border-b-0 sm:border-r">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
              <WalletCards className="size-5 text-muted-foreground" />
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Total Payable
              </p>

              <p className="mt-1 text-lg font-bold">{money(totalPayable)}</p>
            </div>
          </div>

          {/* Total Paid */}
          <div className="flex items-center gap-3 border-b border-border/60 p-5 sm:border-b-0 sm:border-r">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <ReceiptIndianRupee className="size-5 text-primary" />
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Total Paid
              </p>

              <p className="mt-1 text-lg font-bold text-primary">
                {money(totalPaid)}
              </p>
            </div>
          </div>

          {/* Outstanding */}
          <div className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-orange-500/10">
              <ReceiptIndianRupee className="size-5 text-orange-600" />
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Outstanding Balance
              </p>

              <p className="mt-1 text-lg font-bold text-orange-600">
                {money(totalOutstanding)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
