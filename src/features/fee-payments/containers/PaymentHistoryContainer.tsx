"use client";

import { useEffect, useState } from "react";

import { AlertCircle, CreditCard, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { PaymentHistoryFilters } from "@/features/fee-payments/components/PaymentHistoryFilters";
import { PaymentHistorySummary } from "@/features/fee-payments/components/PaymentHistorySummary";

import {
  PaymentHistoryTable,
  type PaymentRow,
} from "@/features/fee-payments/components/PaymentHistoryTable";

import { VoidPaymentDialog } from "@/features/fee-payments/components/VoidPaymentDialog";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

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

  /* ------------------------------------------------------------------------ */
  /* Resolve School Slug                                                      */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    let cancelled = false;

    async function loadParams() {
      const resolvedParams = await params;

      if (!cancelled) {
        setSchoolSlug(resolvedParams.schoolSlug);
      }
    }

    void loadParams();

    return () => {
      cancelled = true;
    };
  }, [params]);

  /* ------------------------------------------------------------------------ */
  /* Fetch Payments                                                           */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* Load Payments                                                            */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* Initial Load                                                             */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    let cancelled = false;

    async function loadInitialPayments() {
      try {
        setLoading(true);
        setError(null);

        const paymentData = await fetchPayments(EMPTY_FILTERS);

        if (!cancelled) {
          setData(paymentData);
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

  /* ------------------------------------------------------------------------ */
  /* Filters                                                                  */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* Void Payment                                                             */
  /* ------------------------------------------------------------------------ */

  function handleVoid(payment: PaymentRow) {
    setSelectedPayment(payment);
    setVoidDialogOpen(true);
  }

  function handleDialogChange(open: boolean) {
    setVoidDialogOpen(open);

    if (!open) {
      setSelectedPayment(null);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Initial Loading                                                          */
  /* ------------------------------------------------------------------------ */

  if (loading && !data) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>

          <h2 className="mt-5 font-semibold">Loading payment history</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Retrieving fee payment records...
          </p>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Initial Error                                                            */
  /* ------------------------------------------------------------------------ */

  if (error && !data) {
    return (
      <div className="p-4 sm:p-6">
        <Card className="mx-auto max-w-lg overflow-hidden border-destructive/20">
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
              <AlertCircle className="size-6 text-destructive" />
            </div>

            <h2 className="mt-5 font-semibold">
              Unable to load payment history
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {error}
            </p>

            <Button
              className="mt-6 rounded-xl"
              onClick={() => void loadPayments(EMPTY_FILTERS)}
            >
              <RefreshCw className="mr-2 size-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <CreditCard className="size-5 text-primary" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Payment History
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              View, search, and manage all fee payments.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => void loadPayments()}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
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

      {/* Refresh Error */}

      {error && data && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="size-5 shrink-0 text-destructive" />

              <p className="text-sm text-destructive">{error}</p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => void loadPayments()}
              disabled={loading}
            >
              <RefreshCw
                className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`}
              />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payment Table */}

      <PaymentHistoryTable
        rows={data?.rows ?? []}
        schoolSlug={schoolSlug}
        onVoid={handleVoid}
      />

      {/* Void Payment Dialog */}

      {selectedPayment && (
        <VoidPaymentDialog
          open={voidDialogOpen}
          onOpenChange={handleDialogChange}
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
