"use client";

import { useState } from "react";

import type {
  FeeRow,
  Installment,
  Student,
  StudentResponse,
} from "../types";

export function useFeeCollection() {
  const [search, setSearch] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [selectedStudent, setSelectedStudent] =
    useState<Student | null>(null);

  const [installments, setInstallments] =
    useState<Installment[]>([]);

  const [studentEnrollmentId, setStudentEnrollmentId] =
    useState<string | null>(null);

  const [feesLoading, setFeesLoading] = useState(false);

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

      const query = `page=1&pageSize=25&search=${encodeURIComponent(searchValue)}`;
      const [activeResponse, alumniResponse] = await Promise.all([
        fetch(`/api/v1/students?${query}&status=ACTIVE`, { cache: "no-store" }),
        fetch(`/api/v1/students?${query}&status=ALUMNI`, { cache: "no-store" }),
      ]);
      const [activeResult, alumniResult] = await Promise.all([
        activeResponse.json(),
        alumniResponse.json(),
      ]);

      if (
        !activeResponse.ok ||
        !activeResult.success ||
        !alumniResponse.ok ||
        !alumniResult.success
      ) {
        setStudents([]);

        return;
      }

      const activeStudents = (activeResult.data as StudentResponse).data ?? [];
      const alumniStudents = (alumniResult.data as StudentResponse).data ?? [];
      setStudents([...activeStudents, ...alumniStudents].slice(0, 25));
    } catch (error) {
      console.error(
        "Student search error:",
        error,
      );

      setStudents([]);
    } finally {
      setSearchLoading(false);
    }
  }

  async function selectStudent(student: Student) {
    try {
      setSelectedStudent(student);

      setInstallments([]);
      setStudentEnrollmentId(null);

      setFeesLoading(true);

      const response = await fetch(
        `/api/v1/fees/student-details?studentId=${encodeURIComponent(
          student.id,
        )}`,
        {
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error(
          "Failed to load fee details:",
          result,
        );

        return;
      }

      const rows: FeeRow[] =
        result.data?.rows ?? [];

      setStudentEnrollmentId(
        result.data?.studentEnrollmentId ?? null,
      );

      setInstallments(
        rows.map((row) => ({
          id: row.id,
          name: row.installmentName,
          payableAmount: Number(
            row.payableAmount,
          ),
          paidAmount: Number(
            row.paidAmount,
          ),
          outstanding: Number(
            row.outstanding,
          ),
          status: row.status,
        })),
      );
    } catch (error) {
      console.error(
        "Failed to load fee details:",
        error,
      );
    } finally {
      setFeesLoading(false);
    }
  }

  function resetStudent() {
    setSelectedStudent(null);

    setInstallments([]);

    setStudentEnrollmentId(null);
  }

  return {
    // Search
    search,
    setSearch,
    students,
    searchLoading,
    hasSearched,
    searchStudents,

    // Selected student
    selectedStudent,
    selectStudent,
    resetStudent,

    // Fees
    installments,
    studentEnrollmentId,
    feesLoading,
  };
}
