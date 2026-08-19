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

type ReceiptFilters = {
  search: string;
  paymentMode: string;
  academicYearId: string;
  fromDate: string;
  toDate: string;
};

const EMPTY_FILTERS: ReceiptFilters = {
  search: "",
  paymentMode: "",
  academicYearId: "",
  fromDate: "",
  toDate: "",
};

export function FeeReceiptsContainer({ schoolSlug }: Props) {
  const [data, setData] = useState<ReceiptData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [paymentMode, setPaymentMode] = useState("");

  const [fromDate, setFromDate] = useState("");

  const [toDate, setToDate] = useState("");

  const [academicYearId, setAcademicYearId] = useState("");

  /* ---------------------------------------------------------------------- */
  /* Fetch Payments - No React State                                       */
  /* ---------------------------------------------------------------------- */

  async function fetchPayments(filters: ReceiptFilters): Promise<ReceiptData> {
    const query = new URLSearchParams();

    if (filters.search.trim()) {
      query.set("search", filters.search.trim());
    }

    if (filters.paymentMode) {
      query.set("paymentMode", filters.paymentMode);
    }

    if (filters.academicYearId) {
      query.set("academicYearId", filters.academicYearId);
    }

    if (filters.fromDate) {
      query.set("fromDate", filters.fromDate);
    }

    if (filters.toDate) {
      query.set("toDate", filters.toDate);
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

    return result.data;
  }

  /* ---------------------------------------------------------------------- */
  /* Load Payments - Used by User Actions                                  */
  /* ---------------------------------------------------------------------- */

  async function loadPayments(
    currentFilters: ReceiptFilters = {
      search,
      paymentMode,
      academicYearId,
      fromDate,
      toDate,
    },
  ) {
    try {
      setLoading(true);
      setError(null);

      const receiptData = await fetchPayments(currentFilters);

      setData(receiptData);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load receipts.",
      );
    } finally {
      setLoading(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Initial Load                                                           */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    async function loadInitialPayments() {
      try {
        const receiptData = await fetchPayments(EMPTY_FILTERS);

        if (!cancelled) {
          setData(receiptData);
          setError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error ? error.message : "Failed to load receipts.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitialPayments();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Clear Filters                                                          */
  /* ---------------------------------------------------------------------- */

  function clearFilters() {
    setSearch("");
    setPaymentMode("");
    setAcademicYearId("");
    setFromDate("");
    setToDate("");

    void loadPayments(EMPTY_FILTERS);
  }

  /* ---------------------------------------------------------------------- */
  /* Loading                                                                */
  /* ---------------------------------------------------------------------- */

  if (loading && !data) {
    return (
      <div className="text-sm text-muted-foreground">Loading receipts...</div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Initial Error                                                          */
  /* ---------------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

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
