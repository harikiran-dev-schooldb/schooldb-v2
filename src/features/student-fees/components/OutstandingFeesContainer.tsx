"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Download, Loader2, RefreshCw } from "lucide-react";

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
import { ManualFeeReminderButton } from "@/features/fees/components/ManualFeeReminderButton";

type Props = {
  schoolSlug: string;
  canSendReminders?: boolean;
};

const PAGE_SIZE = 25;

export function OutstandingFeesContainer({
  schoolSlug,
  canSendReminders = false,
}: Props) {
  const [data, setData] = useState<OutstandingFeesData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [page, setPage] = useState(1);

  const [selectedRow, setSelectedRow] = useState<OutstandingRow | null>(null);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  async function loadOutstanding(
    searchValue = "",
    pageValue = 1,
    classValue = classId,
    sectionValue = sectionId,
  ) {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      if (searchValue.trim()) {
        params.set("search", searchValue.trim());
      }
      if (classValue) params.set("classId", classValue);
      if (sectionValue) params.set("sectionId", sectionValue);

      params.set("page", String(pageValue));

      params.set("pageSize", String(PAGE_SIZE));

      const response = await fetch(
        `/api/v1/fees/outstanding?${params.toString()}`,
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
      setPage(pageValue);
    } catch {
      setError("Failed to load outstanding fees.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const params = new URLSearchParams();

        params.set("page", "1");
        params.set("pageSize", String(PAGE_SIZE));

        const response = await fetch(
          `/api/v1/fees/outstanding?${params.toString()}`,
          {
            cache: "no-store",
          },
        );

        const result = await response.json();

        if (cancelled) return;

        if (!response.ok || !result.success) {
          setError(result.message || "Failed to load outstanding fees.");
          return;
        }

        setData(result.data);
        setPage(1);
      } catch {
        if (!cancelled) {
          setError("Failed to load outstanding fees.");
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

  function handleSearch() {
    void loadOutstanding(search, 1);
  }

  function handlePreviousPage() {
    if (!data?.pagination || page <= 1) {
      return;
    }

    void loadOutstanding(search, page - 1);
  }

  function handleNextPage() {
    if (!data?.pagination || page >= data.pagination.totalPages) {
      return;
    }

    void loadOutstanding(search, page + 1);
  }

  function handleCollect(row: OutstandingRow) {
    setSelectedRow(row);
    setPaymentDialogOpen(true);
  }

  function handlePaymentDialogChange(open: boolean) {
    setPaymentDialogOpen(open);

    if (!open) {
      setSelectedRow(null);
    }
  }

  function handlePaymentSuccess() {
    setSelectedRow(null);

    /*
     * Reload the current page after payment.
     */
    void loadOutstanding(search, page);
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/10">
          <Loader2 className="size-6 animate-spin text-amber-600" />
        </div>
        <h2 className="mt-5 font-semibold">Loading outstanding fees</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Retrieving pending student fee installments...
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card className="mx-auto max-w-lg overflow-hidden rounded-2xl border-destructive/20">
        <CardContent className="flex flex-col items-center px-6 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertCircle className="size-6 text-destructive" />
          </div>
          <h2 className="mt-5 font-semibold">Unable to load outstanding fees</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{error}</p>
          <Button className="mt-6 rounded-xl" onClick={() => void loadOutstanding(search, page)}>
            <RefreshCw className="mr-2 size-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const pagination = data.pagination;

  return (
    <div className="space-y-6">
      <OutstandingFeesSummary summary={data.summary} />

      <div className="flex flex-wrap justify-end gap-2">
        <Button asChild>
          <a href={`/api/v1/reports/${schoolSlug}/fees/outstanding?${new URLSearchParams({
            ...(search.trim() ? { search: search.trim() } : {}),
            ...(classId ? { classId } : {}),
            ...(sectionId ? { sectionId } : {}),
          }).toString()}`}>
            <Download className="size-4" /> Export Excel
          </a>
        </Button>
      </div>

      <OutstandingFeesSearch
        value={search}
        loading={loading}
        onChange={setSearch}
        classId={classId}
        sectionId={sectionId}
        onClassChange={(value) => {
          setClassId(value);
          setSectionId("");
        }}
        onSectionChange={setSectionId}
        onSearch={handleSearch}
      />

      {canSendReminders && (
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/[0.07] via-card to-card p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              WhatsApp fee reminders
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Send overdue reminders using the filters selected above. Weekly
              automatic reminders continue separately.
            </p>
          </div>
          <ManualFeeReminderButton
            schoolSlug={schoolSlug}
            filters={{
              search: search.trim() || undefined,
              classId: classId || undefined,
              sectionId: sectionId || undefined,
            }}
          />
        </div>
      )}

      {error && (
        <Card className="rounded-2xl border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="size-5 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-lg" onClick={() => void loadOutstanding(search, page)} disabled={loading}>
              <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <OutstandingFeesTable rows={data.rows} onCollect={handleCollect} />

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Page <span className="font-semibold text-foreground">{pagination.page}</span> of {pagination.totalPages}
            {" · "}
            {pagination.total} outstanding installments
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              disabled={loading || pagination.page <= 1}
              onClick={handlePreviousPage}
            >
              Previous
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              disabled={loading || pagination.page >= pagination.totalPages}
              onClick={handleNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {selectedRow && (
        <RecordFeePaymentDialog
          open={paymentDialogOpen}
          onOpenChange={handlePaymentDialogChange}
          schoolSlug={schoolSlug}
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
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
