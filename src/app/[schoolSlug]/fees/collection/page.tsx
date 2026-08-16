"use client";

import { useEffect, useState } from "react";
import { Search, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { RecordFeePaymentDialog } from "@/features/student-fees/components/RecordFeePaymentDialog";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Student = {
  id: string;
  admissionNo: string;
  fullName: string | null;

  className: string | null;
  sectionName: string | null;
};

type StudentResponse = {
  data: Student[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type Installment = {
  id: string;
  name: string;
  payableAmount: number;
  paidAmount: number;
  outstanding: number;
  status: "PAID" | "PENDING" | "PARTIAL";
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

type Props = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function FeeCollectionPage({ params }: Props) {
  const [schoolSlug, setSchoolSlug] = useState("");

  const [search, setSearch] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [selectedInstallment, setSelectedInstallment] =
    useState<Installment | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [installments, setInstallments] = useState<Installment[]>([]);

  const [studentEnrollmentId, setStudentEnrollmentId] = useState<string | null>(
    null,
  );

  const [feesLoading, setFeesLoading] = useState(false);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* Get School Slug                                                          */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    async function loadParams() {
      const resolvedParams = await params;

      setSchoolSlug(resolvedParams.schoolSlug);
    }

    void loadParams();
  }, [params]);

  /* ------------------------------------------------------------------------ */
  /* Search Students                                                          */
  /* ------------------------------------------------------------------------ */

  async function searchStudents() {
    const searchValue = search.trim();

    if (!searchValue) {
      setStudents([]);
      setHasSearched(false);

      return;
    }

    try {
      setSearchLoading(true);
      setHasSearched(true);

      const response = await fetch(
        `/api/v1/students?page=1&pageSize=25&search=${encodeURIComponent(
          searchValue,
        )}`,
        {
          cache: "no-store",
        },
      );

      const result = await response.json();

      console.log("STUDENT SEARCH:", result);

      if (!response.ok || !result.success) {
        setStudents([]);

        return;
      }

      /*
       * Your existing student API structure:
       *
       * result.data = {
       *   data: Student[],
       *   total,
       *   page,
       *   pageSize,
       *   totalPages
       * }
       */

      const studentResponse: StudentResponse = result.data;

      setStudents(studentResponse.data ?? []);
    } catch (error) {
      console.error("Student search error:", error);

      setStudents([]);
    } finally {
      setSearchLoading(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Select Student and Load Outstanding Fees                                */
  /* ------------------------------------------------------------------------ */

  async function selectStudent(student: Student) {
    try {
      setSelectedStudent(student);

      setInstallments([]);
      setStudentEnrollmentId(null);

      setFeesLoading(true);

      const response = await fetch(
        `/api/v1/fees/student-details?studentId=${encodeURIComponent(student.id)}`,
        {
          cache: "no-store",
        },
      );

      const result = await response.json();

      console.log("STUDENT FEE DETAILS:", result);

      if (!response.ok || !result.success) {
        console.error("Failed to load fee details:", result);
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

  /* ------------------------------------------------------------------------ */
  /* Reset Student                                                            */
  /* ------------------------------------------------------------------------ */

  function resetStudent() {
    setSelectedStudent(null);

    setInstallments([]);

    setStudentEnrollmentId(null);

    setPaymentDialogOpen(false);
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-6 p-6">
      {/* Header */}

      <div>
        <h1 className="text-2xl font-semibold">Fee Collection</h1>

        <p className="text-sm text-muted-foreground">
          Search a student and collect pending fees.
        </p>
      </div>

      {/* ================================================================== */}
      {/* Student Search                                                     */}
      {/* ================================================================== */}

      {!selectedStudent && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void searchStudents();
                      }
                    }}
                    placeholder="Search by student name or admission number..."
                    className="pl-9"
                  />
                </div>

                <Button
                  onClick={() => void searchStudents()}
                  disabled={searchLoading}
                >
                  {searchLoading ? "Searching..." : "Search"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Loading */}

          {searchLoading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Searching students...
            </div>
          )}

          {/* Student Results */}

          {!searchLoading && students.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Students ({students.length})</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between gap-4 rounded-lg border p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                        <UserRound className="h-5 w-5 text-muted-foreground" />
                      </div>

                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {student.fullName || "—"}
                        </div>

                        <div className="text-sm text-muted-foreground">
                          Admission No: {student.admissionNo}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {student.className || "No Class"}

                          {student.sectionName
                            ? ` - ${student.sectionName}`
                            : ""}
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => void selectStudent(student)}
                    >
                      Select
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* No Results */}

          {!searchLoading && hasSearched && students.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No students found.
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ================================================================== */}
      {/* Selected Student                                                    */}
      {/* ================================================================== */}

      {selectedStudent && (
        <>
          <Card>
            <CardContent className="flex items-center justify-between gap-4 p-5">
              <div>
                <div className="text-lg font-semibold">
                  {selectedStudent.fullName || "—"}
                </div>

                <div className="mt-1 text-sm text-muted-foreground">
                  Admission No: {selectedStudent.admissionNo}
                </div>

                <div className="text-sm text-muted-foreground">
                  {selectedStudent.className || "No Class"}

                  {selectedStudent.sectionName
                    ? ` - ${selectedStudent.sectionName}`
                    : ""}
                </div>
              </div>

              <Button variant="outline" onClick={resetStudent}>
                Change Student
              </Button>
            </CardContent>
          </Card>

          {/* Pending Fees */}

          <Card>
            <CardHeader>
              <CardTitle>Fee Terms</CardTitle>
            </CardHeader>

            <CardContent>
              {feesLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Loading fee details...
                </div>
              ) : installments.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No fee details found for this student.
                </div>
              ) : (
                <div className="space-y-3">
                  {installments.map((installment) => (
                    <div
                      key={installment.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <div className="font-medium">{installment.name}</div>

                        <div className="mt-1 text-sm text-muted-foreground">
                          Payable: {money(installment.payableAmount)}
                          {" · "}
                          Paid: {money(installment.paidAmount)}
                        </div>
                      </div>

                      <div className="flex items-center gap-5">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            Balance
                          </div>

                          <div className="font-semibold">
                            {money(installment.outstanding)}
                          </div>
                        </div>

                        <Badge
                          variant={
                            installment.status === "PAID"
                              ? "secondary"
                              : installment.status === "PARTIAL"
                                ? "outline"
                                : "destructive"
                          }
                        >
                          {installment.status}
                        </Badge>

                        {installment.outstanding > 0 && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedInstallment(installment);
                              setPaymentDialogOpen(true);
                            }}
                          >
                            Collect
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Dialog */}

          {studentEnrollmentId && selectedInstallment && (
            <RecordFeePaymentDialog
              open={paymentDialogOpen}
              onOpenChange={(open) => {
                setPaymentDialogOpen(open);

                if (!open) {
                  setSelectedInstallment(null);
                }
              }}
              schoolSlug={schoolSlug}
              studentFeeId=""
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
      )}
    </div>
  );
}
