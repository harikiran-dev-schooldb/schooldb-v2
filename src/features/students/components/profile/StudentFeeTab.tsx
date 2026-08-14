"use client";

import { useEffect, useState } from "react";

import { StudentFeeLedger } from "@/features/student-fees/components/StudentFeeLedger";

type Props = {
  studentId: string;
};

type StudentFee = {
  id: string;
  active: boolean;

  feePlan: {
    id: string;
    name: string;
  };
};

export function StudentFeeTab({ studentId }: Props) {
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStudentFees() {
      try {
        const response = await fetch(
          `/api/v1/student-fees?studentId=${studentId}`,
          {
            cache: "no-store",
          },
        );

        console.log("PROFILE STUDENT ID:", studentId);

        const result = await response.json();

        console.log("STUDENT FEES RESPONSE:", result);

        if (!response.ok || !result.success) {
          setStudentFees([]);
          return;
        }

        setStudentFees(result.data ?? []);
      } catch (error) {
        console.error("Failed to load student fees:", error);
        setStudentFees([]);
      } finally {
        setLoading(false);
      }
    }

    void loadStudentFees();
  }, [studentId]);

  if (loading) {
    return (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">
        Loading fee details...
      </div>
    );
  }

  if (studentFees.length === 0) {
    return (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">
        No fee plan assigned to this student.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {studentFees.map((studentFee) => (
        <div key={studentFee.id}>
          <div className="mb-4">
            <h3 className="font-semibold">{studentFee.feePlan.name}</h3>
          </div>

          <StudentFeeLedger studentFeeId={studentFee.id} />
        </div>
      ))}
    </div>
  );
}
