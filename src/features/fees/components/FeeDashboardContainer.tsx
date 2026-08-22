"use client";

import { AlertCircle, BarChart3, RefreshCw, WalletCards } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useFeeDashboard } from "../hooks/useFeeDashboard";

import { FeeDashboardHeader } from "./FeeDashboardHeader";
import { FeeCollectionCards } from "./FeeCollectionCards";
import { FeeSummaryCard } from "./FeeSummaryCard";
import { PaymentModesCard } from "./PaymentModesCard";
import { InstallmentStatusCard } from "./InstallmentStatusCard";
import { RecentPaymentsTable } from "./RecentPaymentsTable";

export function FeeDashboardContainer() {
  const [academicYearId, setAcademicYearId] = useState("");

  const { data, loading, error, reload } = useFeeDashboard(academicYearId);

  /* ---------------------------------------------------------------------- */
  /* Loading                                                                */
  /* ---------------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="h-7 w-48 animate-pulse rounded-lg bg-muted" />

            <div className="mt-2 h-4 w-72 animate-pulse rounded-md bg-muted" />
          </div>

          <div className="h-10 w-full animate-pulse rounded-xl bg-muted sm:w-[220px]" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Card
              key={item}
              className="overflow-hidden rounded-2xl border-border/60 shadow-sm"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="h-4 w-28 animate-pulse rounded bg-muted" />

                    <div className="h-8 w-36 animate-pulse rounded bg-muted" />
                  </div>

                  <div className="size-11 animate-pulse rounded-xl bg-muted" />
                </div>

                <div className="mt-5 h-3 w-40 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2].map((item) => (
            <Card
              key={item}
              className="overflow-hidden rounded-2xl border-border/60 shadow-sm"
            >
              <CardContent className="space-y-5 p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-5 w-32 animate-pulse rounded bg-muted" />

                    <div className="h-3 w-48 animate-pulse rounded bg-muted" />
                  </div>

                  <div className="size-11 animate-pulse rounded-xl bg-muted" />
                </div>

                {[1, 2, 3, 4].map((row) => (
                  <div key={row} className="flex items-center justify-between">
                    <div className="h-10 w-36 animate-pulse rounded-xl bg-muted" />

                    <div className="h-5 w-24 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardContent className="flex min-h-48 flex-col items-center justify-center text-center">
            <div className="flex size-12 animate-pulse items-center justify-center rounded-2xl bg-primary/10">
              <WalletCards className="size-5 text-primary" />
            </div>

            <p className="mt-4 text-sm font-medium">Loading fee dashboard...</p>

            <p className="mt-1 text-xs text-muted-foreground">
              Preparing your collection and payment insights.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Error                                                                  */
  /* ---------------------------------------------------------------------- */

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <FeeDashboardHeader
          academicYearId={academicYearId}
          onAcademicYearChange={setAcademicYearId}
        />

        <Card className="overflow-hidden rounded-2xl border-destructive/20 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
              <AlertCircle className="size-6 text-destructive" />
            </div>

            <h2 className="mt-5 text-lg font-semibold">
              Unable to load fee dashboard
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {error}
            </p>

            <Button className="mt-6 rounded-xl" onClick={reload}>
              <RefreshCw className="mr-2 size-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Empty                                                                  */
  /* ---------------------------------------------------------------------- */

  if (!data) {
    return (
      <div className="space-y-6 p-6">
        <FeeDashboardHeader
          academicYearId={academicYearId}
          onAcademicYearChange={setAcademicYearId}
        />

        <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <BarChart3 className="size-6 text-muted-foreground" />
            </div>

            <h2 className="mt-5 text-lg font-semibold">
              No dashboard data available
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Fee collection information will appear here when data is available
              for the selected academic year.
            </p>

            <Button
              variant="outline"
              className="mt-6 rounded-xl"
              onClick={reload}
            >
              <RefreshCw className="mr-2 size-4" />
              Reload Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Dashboard                                                              */
  /* ---------------------------------------------------------------------- */

  const { summary, collection, paymentModes, recentPayments } = data;

  return (
    <div className="space-y-6 p-6">
      <FeeDashboardHeader
        academicYearId={academicYearId}
        onAcademicYearChange={setAcademicYearId}
      />

      <FeeCollectionCards
        today={collection.today}
        todayPaymentCount={collection.todayPaymentCount}
        thisMonth={collection.thisMonth}
        thisMonthPaymentCount={collection.thisMonthPaymentCount}
        totalPayable={summary.totalPayable}
        outstanding={summary.outstanding}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <FeeSummaryCard
          totalAmount={summary.totalAmount}
          totalConcession={summary.totalConcession}
          totalPayable={summary.totalPayable}
          totalPaid={summary.totalPaid}
          outstanding={summary.outstanding}
        />

        <PaymentModesCard paymentModes={paymentModes} />
      </div>

      <InstallmentStatusCard
        pendingCount={summary.pendingCount}
        partialCount={summary.partialCount}
        paidCount={summary.paidCount}
        waivedCount={summary.waivedCount}
      />

      <RecentPaymentsTable payments={recentPayments} />
    </div>
  );
}
