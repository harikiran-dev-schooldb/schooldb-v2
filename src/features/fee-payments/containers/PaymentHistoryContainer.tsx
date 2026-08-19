"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { PaymentHistoryFilters } from "@/features/fee-payments/components/PaymentHistoryFilters";

import { PaymentHistorySummary } from "@/features/fee-payments/components/PaymentHistorySummary";

import {
  PaymentHistoryTable,
  type PaymentRow,
} from "@/features/fee-payments/components/PaymentHistoryTable";

import { VoidPaymentDialog } from "@/features/fee-payments/components/VoidPaymentDialog";

type PaymentData = {
  rows: PaymentRow[];

  summary: {
    paymentCount: number;
    totalAmount: number;
  };
};

type Props = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

type PaymentFilters = {
  search: string;
  paymentMode: string;
  fromDate: string;
  toDate: string;
};

const EMPTY_FILTERS: PaymentFilters = {
  search: "",
  paymentMode: "",
  fromDate: "",
  toDate: "",
};

export function PaymentHistoryContainer({ params }: Props) {
  const [schoolSlug, setSchoolSlug] = useState("");

  const [data, setData] = useState<PaymentData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<PaymentFilters>(EMPTY_FILTERS);

  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(
    null,
  );

  const [voidDialogOpen, setVoidDialogOpen] = useState(false);

  /* ---------------------------------------------------------------------- */
  /* School Slug                                                            */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    async function loadParams() {
      const resolvedParams = await params;

      setSchoolSlug(resolvedParams.schoolSlug);
    }

    void loadParams();
  }, [params]);

  /* ---------------------------------------------------------------------- */
  /* Load Payments                                                          */
  /* ---------------------------------------------------------------------- */

  async function fetchPayments(
    currentFilters: PaymentFilters,
  ): Promise<PaymentData> {
    const queryParams = new URLSearchParams();

    if (currentFilters.search.trim()) {
      queryParams.set("search", currentFilters.search.trim());
    }

    if (currentFilters.paymentMode) {
      queryParams.set("paymentMode", currentFilters.paymentMode);
    }

    if (currentFilters.fromDate) {
      queryParams.set("fromDate", currentFilters.fromDate);
    }

    if (currentFilters.toDate) {
      queryParams.set("toDate", currentFilters.toDate);
    }

    const query = queryParams.toString();

    const response = await fetch(
      `/api/v1/fee-payments${query ? `?${query}` : ""}`,
      {
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to load payment history.");
    }

    return result.data;
  }

  async function loadPayments(currentFilters: PaymentFilters = filters) {
    try {
      setLoading(true);
      setError(null);

      const paymentData = await fetchPayments(currentFilters);

      setData(paymentData);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load payment history.",
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
        const paymentData = await fetchPayments(EMPTY_FILTERS);

        if (!cancelled) {
          setData(paymentData);
          setError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to load payment history.",
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
  /* Filters                                                                */
  /* ---------------------------------------------------------------------- */

  function updateFilter(key: keyof PaymentFilters, value: string) {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function handleSearch() {
    void loadPayments(filters);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);

    void loadPayments(EMPTY_FILTERS);
  }

  /* ---------------------------------------------------------------------- */
  /* Void Payment                                                           */
  /* ---------------------------------------------------------------------- */

  function handleVoid(payment: PaymentRow) {
    setSelectedPayment(payment);

    setVoidDialogOpen(true);
  }

  /* ---------------------------------------------------------------------- */
  /* Loading                                                                */
  /* ---------------------------------------------------------------------- */

  if (loading && !data) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Loading payment history...
        </p>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Initial Error                                                          */
  /* ---------------------------------------------------------------------- */

  if (error && !data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-destructive">{error}</p>

            <Button className="mt-4" onClick={() => void loadPayments()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="space-y-6 p-6">
      {/* Header */}

      <div>
        <h1 className="text-2xl font-semibold">Payment History</h1>

        <p className="text-sm text-muted-foreground">
          View and manage all fee payments.
        </p>
      </div>

      {/* Summary */}

      <PaymentHistorySummary
        paymentCount={data?.summary.paymentCount ?? 0}
        totalAmount={data?.summary.totalAmount ?? 0}
      />

      {/* Filters */}

      <PaymentHistoryFilters
        search={filters.search}
        paymentMode={filters.paymentMode}
        fromDate={filters.fromDate}
        toDate={filters.toDate}
        loading={loading}
        onSearchChange={(value) => updateFilter("search", value)}
        onPaymentModeChange={(value) => updateFilter("paymentMode", value)}
        onFromDateChange={(value) => updateFilter("fromDate", value)}
        onToDateChange={(value) => updateFilter("toDate", value)}
        onSearch={handleSearch}
        onClear={clearFilters}
      />

      {/* Error After Existing Data */}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Table */}

      <PaymentHistoryTable
        rows={data?.rows ?? []}
        schoolSlug={schoolSlug}
        onVoid={handleVoid}
      />

      {/* Void Dialog */}

      {selectedPayment && (
        <VoidPaymentDialog
          open={voidDialogOpen}
          onOpenChange={(open) => {
            setVoidDialogOpen(open);

            if (!open) {
              setSelectedPayment(null);
            }
          }}
          paymentId={selectedPayment.id}
          receiptNo={selectedPayment.receiptNo}
          onSuccess={() => {
            setSelectedPayment(null);

            void loadPayments();
          }}
        />
      )}
    </div>
  );
}
