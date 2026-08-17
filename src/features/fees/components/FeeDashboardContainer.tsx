"use client";

import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

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

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-sm text-muted-foreground">
          Loading fee dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-destructive">{error}</div>

            <Button className="mt-4" onClick={reload}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

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
