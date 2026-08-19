"use client";

import { useCallback, useEffect, useState } from "react";

import { PendingFeesTable } from "./PendingFeesTable";

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

  feeCategory: {
    id: string;
    name: string;
    code: string;
  };

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

  feePlan: {
    id: string;
    name: string;

    academicYear: {
      id: string;
      name: string;
    };
  };
};

type Summary = {
  installmentCount: number;
  totalPayable: number;
  totalConcession: number;
  totalPaid: number;
  outstanding: number;
};

type PendingFeesResponse = {
  rows?: PendingFeeRow[];
  summary?: Summary | null;
};

export function PendingFeesPage() {
  const [rows, setRows] = useState<PendingFeeRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPendingFees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/v1/student-fees/pending", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load pending fees.");
      }

      const data = result.data as PendingFeesResponse;

      setRows(data.rows ?? []);
      setSummary(data.summary ?? null);
    } catch (error) {
      setRows([]);
      setSummary(null);

      setError(
        error instanceof Error ? error.message : "Failed to load pending fees.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const response = await fetch("/api/v1/student-fees/pending", {
          cache: "no-store",
        });

        const result = await response.json();

        if (cancelled) return;

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load pending fees.");
        }

        const data = result.data as PendingFeesResponse;

        setRows(data.rows ?? []);
        setSummary(data.summary ?? null);
        setError(null);
      } catch (error) {
        if (!cancelled) {
          setRows([]);
          setSummary(null);

          setError(
            error instanceof Error
              ? error.message
              : "Failed to load pending fees.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initialLoad();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="p-6">Loading pending fees...</div>;
  }

  if (error) {
    return (
      <div className="space-y-4 p-6">
        <div className="text-destructive">{error}</div>

        <button
          type="button"
          onClick={() => void loadPendingFees()}
          className="rounded-md border px-4 py-2 text-sm font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Pending Fees</h1>

        <p className="text-sm text-muted-foreground">
          View and collect pending student fees.
        </p>
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              Pending Installments
            </p>

            <p className="text-2xl font-bold">{summary.installmentCount}</p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total Payable</p>

            <p className="text-2xl font-bold">
              ₹{summary.totalPayable.toLocaleString()}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total Paid</p>

            <p className="text-2xl font-bold">
              ₹{summary.totalPaid.toLocaleString()}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Outstanding</p>

            <p className="text-2xl font-bold">
              ₹{summary.outstanding.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      <PendingFeesTable rows={rows} onPaymentSuccess={loadPendingFees} />
    </div>
  );
}
