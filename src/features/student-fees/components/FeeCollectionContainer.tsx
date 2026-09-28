"use client";

import { useState } from "react";

import { SelectedStudentCard } from "@/features/student-fees/components/SelectedStudentCard";
import {
  FeeTermsCard,
  type Installment,
} from "@/features/student-fees/components/FeeTermsCard";
import { RecordFeePaymentDialog } from "@/features/student-fees/components/RecordFeePaymentDialog";
import { StaffCashfreePaymentDialog } from "@/features/online-payments/components/StaffCashfreeQrDialog";
import { StudentFeeSearch } from "./StudentFeeSearch";

type Student = {
  id: string;
  admissionNo: string;
  fullName: string | null;

  className: string | null;
  sectionName: string | null;
};

type FeeRow = {
  id: string;

  installmentName: string;
  sequence: number;

  dueDate: string;

  payableAmount: number;
  paidAmount: number;
  outstanding: number;

  status: "PAID" | "PENDING" | "PARTIAL";

  studentEnrollmentId: string;
  studentFeeId: string;

  feePlan: {
    id: string;
    name: string;
  };

  feeCategory: {
    name: string;
  };
};

type FeeDetailsResponse = {
  success?: boolean;
  message?: string;
  data?: {
    studentEnrollmentId?: string | null;
    rows?: FeeRow[];
  };
};

type Props = {
  schoolSlug: string;
  allowCashfreePayments?: boolean;
};

export function FeeCollectionContainer({ schoolSlug, allowCashfreePayments = false }: Props) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [installments, setInstallments] = useState<Installment[]>([]);

  const [studentEnrollmentId, setStudentEnrollmentId] = useState<string | null>(
    null,
  );

  const [feesLoading, setFeesLoading] = useState(false);

  const [selectedInstallment, setSelectedInstallment] =
    useState<Installment | null>(null);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [cashfreeInstallment, setCashfreeInstallment] = useState<Installment | null>(null);

  const [feesError, setFeesError] = useState<string | null>(null);

  /* ---------------------------------------------------------------------- */
  /* Select Student                                                         */
  /* ---------------------------------------------------------------------- */

  async function selectStudent(student: Student) {
    try {
      setInstallments([]);
      setStudentEnrollmentId(null);
      setFeesError(null);
      setSelectedStudent(student);
      setFeesLoading(true);

      const response = await fetch(
        `/api/v1/fees/student-details?studentId=${encodeURIComponent(
          student.id,
        )}`,
        {
          cache: "no-store",
        },
      );

      const text = await response.text();

      let result: FeeDetailsResponse = {};

      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        console.error(
          "Failed to parse fee details response:",
          response.status,
          text,
        );
        return;
      }

      if (!response.ok || !result.success) {
        setFeesError(
          result.message || "Unable to load fee details for this student.",
        );

        return;
      }

      const rows: FeeRow[] = result.data?.rows ?? [];

      setStudentEnrollmentId(result.data?.studentEnrollmentId ?? null);

      setInstallments(
        rows.map((row) => ({
          id: row.id,
          name: row.installmentName,
          sequence: row.sequence,
          dueDate: row.dueDate,
          payableAmount: Number(row.payableAmount),
          paidAmount: Number(row.paidAmount),
          outstanding: Number(row.outstanding),
          status: row.status,
          studentFeeId: row.studentFeeId,
          feePlanId: row.feePlan.id,
          feePlanName: row.feePlan.name,
          feeCategoryName: row.feeCategory.name,
        })),
      );
    } catch (error) {
      console.error("Failed to load fee details:", error);
    } finally {
      setFeesLoading(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Reset Student                                                          */
  /* ---------------------------------------------------------------------- */

  function resetStudent() {
    setSelectedStudent(null);

    setInstallments([]);

    setStudentEnrollmentId(null);

    setSelectedInstallment(null);

    setPaymentDialogOpen(false);
    setCashfreeInstallment(null);
    setFeesError(null);
  }

  /* ---------------------------------------------------------------------- */
  /* Collect                                                                */
  /* ---------------------------------------------------------------------- */

  function handleCollect(installment: Installment) {
    setSelectedInstallment(installment);

    setPaymentDialogOpen(true);
  }

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <>
      {!selectedStudent ? (
        <div className="w-full">
          <StudentFeeSearch onSelectStudent={selectStudent} />
        </div>
      ) : (
        <div className="w-full space-y-6">
          <SelectedStudentCard
            student={selectedStudent}
            installments={installments}
            onChangeStudent={resetStudent}
          />

          {feesLoading ? (
            <FeeTermsCard installments={[]} loading onCollect={handleCollect} />
          ) : feesError ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50/40 p-8 text-center">
              <h3 className="font-semibold text-slate-900">
                Unable to load fee details
              </h3>

              <p className="mt-2 max-w-lg text-sm text-slate-500">
                {feesError}
              </p>
            </div>
          ) : installments.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
              <h3 className="font-semibold text-slate-800">No fees assigned</h3>

              <p className="mt-2 max-w-lg text-sm text-slate-500">
                No fee installments have been assigned to this student yet.
              </p>
            </div>
          ) : (
            <FeeTermsCard
              installments={installments}
              loading={false}
              onCollect={handleCollect}
              onCashfreePayment={allowCashfreePayments ? setCashfreeInstallment : undefined}
            />
          )}
        </div>
      )}

      {selectedStudent && studentEnrollmentId && selectedInstallment && (
        <RecordFeePaymentDialog
          open={paymentDialogOpen}
          onOpenChange={(open) => {
            setPaymentDialogOpen(open);

            if (!open) {
              setSelectedInstallment(null);
            }
          }}
          schoolSlug={schoolSlug}
          studentEnrollmentId={studentEnrollmentId}
          installments={installments
            .filter((installment) => installment.outstanding > 0)
            .map((installment) => ({
              id: installment.id,
              name: installment.name,
              payableAmount: installment.payableAmount,
              paidAmount: installment.paidAmount,
              outstanding: installment.outstanding,
              sequence: installment.sequence,
              dueDate: installment.dueDate,
              feePlanId: installment.feePlanId,
              feePlanName: installment.feePlanName,
              feeCategoryName: installment.feeCategoryName,
              status: installment.status,
            }))}
          onSuccess={() => {
            setSelectedInstallment(null);

            void selectStudent(selectedStudent);
          }}
        />
      )}

      {selectedStudent && cashfreeInstallment ? (
        <StaffCashfreePaymentDialog
          open
          onOpenChange={(open) => {
            if (!open) setCashfreeInstallment(null);
          }}
          schoolSlug={schoolSlug}
          student={selectedStudent}
          installments={installments
            .filter((installment) => installment.outstanding > 0)
            .map((installment) => ({
              id: installment.id,
              name: installment.name,
              outstanding: installment.outstanding,
              studentFeeId: installment.studentFeeId ?? "",
              sequence: installment.sequence ?? 0,
            }))}
          initialInstallmentId={cashfreeInstallment.id}
          onSuccess={() => {
            void selectStudent(selectedStudent);
          }}
        />
      ) : null}
    </>
  );
}
