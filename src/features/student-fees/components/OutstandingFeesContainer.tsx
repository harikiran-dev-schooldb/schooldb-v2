"use client";

import { useEffect, useState } from "react";

import { OutstandingFeesSummary } from "@/features/student-fees/components/OutstandingFeesSummary";

import { OutstandingFeesSearch } from "@/features/student-fees/components/OutstandingFeesSearch";

import { OutstandingFeesTable } from "@/features/student-fees/components/OutstandingFeesTable";

import { RecordFeePaymentDialog } from "@/features/student-fees/components/RecordFeePaymentDialog";

import type {
  OutstandingFeesData,
  OutstandingRow,
} from "@/features/student-fees/types/outstanding-fees";

import { Card, CardContent } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

type Props = {
  schoolSlug: string;
};

export function OutstandingFeesContainer({ schoolSlug }: Props) {
  const [data, setData] = useState<OutstandingFeesData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [selectedRow, setSelectedRow] = useState<OutstandingRow | null>(null);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  /* ---------------------------------------------------------------------- */
  /* Load Outstanding Fees                                                  */
  /* ---------------------------------------------------------------------- */

  async function loadOutstanding(searchValue = "") {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      if (searchValue.trim()) {
        params.set("search", searchValue.trim());
      }

      const query = params.toString();

      const response = await fetch(
        `/api/v1/fees/outstanding${query ? `?${query}` : ""}`,
        {
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message || "Failed to load outstanding fees.");

        return;
      }

      setData(result.data);
    } catch {
      setError("Failed to load outstanding fees.");
    } finally {
      setLoading(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Initial Load                                                           */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    void loadOutstanding();
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Search                                                                 */
  /* ---------------------------------------------------------------------- */

  function handleSearch() {
    void loadOutstanding(search);
  }

  /* ---------------------------------------------------------------------- */
  /* Collect                                                                */
  /* ---------------------------------------------------------------------- */

  function handleCollect(row: OutstandingRow) {
    setSelectedRow(row);

    setPaymentDialogOpen(true);
  }

  /* ---------------------------------------------------------------------- */
  /* Loading                                                                */
  /* ---------------------------------------------------------------------- */

  if (loading && !data) {
    return (
      <div className="py-6 text-sm text-muted-foreground">
        Loading outstanding fees...
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Initial Error                                                          */
  /* ---------------------------------------------------------------------- */

  if (error && !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-destructive">{error}</div>

          <Button className="mt-4" onClick={() => void loadOutstanding(search)}>
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
    <div className="space-y-6">
      <OutstandingFeesSummary summary={data.summary} />

      <OutstandingFeesSearch
        value={search}
        loading={loading}
        onChange={setSearch}
        onSearch={handleSearch}
      />

      {error && (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-destructive">{error}</div>
          </CardContent>
        </Card>
      )}

      <OutstandingFeesTable rows={data.rows} onCollect={handleCollect} />

      {selectedRow && (
        <RecordFeePaymentDialog
          open={paymentDialogOpen}
          onOpenChange={(open) => {
            setPaymentDialogOpen(open);

            if (!open) {
              setSelectedRow(null);
            }
          }}
          schoolSlug={schoolSlug}
          studentFeeId={selectedRow.studentFeeId}
          studentEnrollmentId={selectedRow.studentEnrollmentId}
          installments={[
            {
              id: selectedRow.id,
              name: selectedRow.installmentName,
              payableAmount: selectedRow.payableAmount,
              paidAmount: selectedRow.paidAmount,
              outstanding: selectedRow.outstanding,
            },
          ]}
          onSuccess={() => {
            setSelectedRow(null);

            void loadOutstanding(search);
          }}
        />
      )}
    </div>
  );
}
