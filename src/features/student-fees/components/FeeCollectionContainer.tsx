"use client";

import { useState } from "react";

import { SelectedStudentCard } from "@/features/student-fees/components/SelectedStudentCard";
import {
  FeeTermsCard,
  type Installment,
} from "@/features/student-fees/components/FeeTermsCard";
import { RecordFeePaymentDialog } from "@/features/student-fees/components/RecordFeePaymentDialog";
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

  dueDate: string;

  payableAmount: number;
  paidAmount: number;
  outstanding: number;

  status: "PAID" | "PENDING" | "PARTIAL";

  studentEnrollmentId: string;
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
};

export function FeeCollectionContainer({ schoolSlug }: Props) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [installments, setInstallments] = useState<Installment[]>([]);

  const [studentEnrollmentId, setStudentEnrollmentId] = useState<string | null>(
    null,
  );

  const [feesLoading, setFeesLoading] = useState(false);

  const [selectedInstallment, setSelectedInstallment] =
    useState<Installment | null>(null);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

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
          payableAmount: Number(row.payableAmount),
          paidAmount: Number(row.paidAmount),
          outstanding: Number(row.outstanding),
          status: row.status,
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
        <StudentFeeSearch onSelectStudent={selectStudent} />
      ) : (
        <div className="space-y-6">
          <SelectedStudentCard
            student={selectedStudent}
            installments={installments}
            onChangeStudent={resetStudent}
          />

          {feesLoading ? (
            <FeeTermsCard installments={[]} loading onCollect={handleCollect} />
          ) : feesError ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <h3 className="font-semibold">Unable to load fee details</h3>

              <p className="mt-2 text-sm text-muted-foreground">{feesError}</p>
            </div>
          ) : installments.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
              <h3 className="font-semibold">No fees assigned</h3>

              <p className="mt-2 text-sm text-muted-foreground">
                No fee installments have been assigned to this student yet.
              </p>
            </div>
          ) : (
            <FeeTermsCard
              installments={installments}
              loading={false}
              onCollect={handleCollect}
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
            }))}
          onSuccess={() => {
            setSelectedInstallment(null);

            void selectStudent(selectedStudent);
          }}
        />
      )}
    </>
  );
}
