"use client";

import { useEffect, useState } from "react";

import { FeeReceiptsTable, type PaymentRow } from "./FeeReceiptsTable";

import { FeeReceiptsSummary } from "./FeeReceiptsSummary";

import { FeeReceiptsFilters } from "./FeeReceiptsFilters";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ReceiptData = {
  rows: PaymentRow[];

  summary: {
    paymentCount: number;
    totalAmount: number;
  };
};

type Props = {
  schoolSlug: string;
};

export function FeeReceiptsContainer({ schoolSlug }: Props) {
  const [data, setData] = useState<ReceiptData | null>(null);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [paymentMode, setPaymentMode] = useState("");

  const [fromDate, setFromDate] = useState("");

  const [toDate, setToDate] = useState("");

  const [academicYearId, setAcademicYearId] = useState("");

  async function loadPayments() {
    try {
      setLoading(true);
      setError(null);

      const query = new URLSearchParams();

      if (search.trim()) {
        query.set("search", search.trim());
      }

      if (paymentMode) {
        query.set("paymentMode", paymentMode);
      }

      if (academicYearId) {
        query.set("academicYearId", academicYearId);
      }

      if (fromDate) {
        query.set("fromDate", fromDate);
      }

      if (toDate) {
        query.set("toDate", toDate);
      }

      const queryString = query.toString();

      const response = await fetch(
        `/api/v1/fee-payments${queryString ? `?${queryString}` : ""}`,
        {
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load receipts.");
      }

      setData(result.data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load receipts.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPayments();
  }, []);

  function clearFilters() {
    setSearch("");
    setPaymentMode("");
    setAcademicYearId("");
    setFromDate("");
    setToDate("");

    /*
     * Load unfiltered data directly.
     * Do not rely on updated React state immediately.
     */
    void loadAllPayments();
  }

  async function loadAllPayments() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/v1/fee-payments", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load receipts.");
      }

      setData(result.data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load receipts.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="text-sm text-muted-foreground">Loading receipts...</div>
    );
  }

  if (error && !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-destructive">{error}</p>

          <Button className="mt-4" onClick={() => void loadPayments()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <>
      <FeeReceiptsSummary
        paymentCount={data.summary.paymentCount}
        totalAmount={data.summary.totalAmount}
      />

      <FeeReceiptsFilters
        search={search}
        onSearchChange={setSearch}
        academicYearId={academicYearId}
        onAcademicYearChange={setAcademicYearId}
        paymentMode={paymentMode}
        onPaymentModeChange={setPaymentMode}
        fromDate={fromDate}
        onFromDateChange={setFromDate}
        toDate={toDate}
        onToDateChange={setToDate}
        onApply={() => void loadPayments()}
        onClear={clearFilters}
        loading={loading}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <FeeReceiptsTable schoolSlug={schoolSlug} rows={data.rows} />
    </>
  );
}
