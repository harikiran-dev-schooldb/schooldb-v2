"use client";

import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers3,
  XCircle,
} from "lucide-react";

import { DataGrid } from "@/components/datagrid/DataGrid";

import { subjectColumns } from "../columns";
import { useSubjectTable } from "../hooks/useSubjectTable";
import { SubjectToolbar } from "./SubjectToolbar";
import { Button } from "@/components/ui/button";

function StatCard({
  icon: Icon,
  label,
  value,
  description,
  tone = "default",
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
  description: string;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>

          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>

        <div
          className={[
            "flex size-10 items-center justify-center rounded-xl",
            tone === "success"
              ? "bg-emerald-500/10 text-emerald-600"
              : tone === "danger"
                ? "bg-red-500/10 text-red-600"
                : "bg-primary/10 text-primary",
          ].join(" ")}
        >
          <Icon className="size-5" />
        </div>
      </div>

      <div className="pointer-events-none absolute -bottom-8 -right-8 size-24 rounded-full bg-primary/[0.025] transition-transform duration-300 group-hover:scale-125" />
    </div>
  );
}

export function SubjectTable() {
  const {
    subjects,
    loading,
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    total,
    totalPages,
  } = useSubjectTable();

  /*
   * These statistics represent the currently loaded page.
   *
   * Total subjects uses the API total so it represents
   * the complete subject count rather than only 25 records.
   */
  const active = subjects.filter((subject) => subject.active).length;

  const inactive = subjects.filter((subject) => !subject.active).length;

  const scholastic = subjects.filter(
    (subject) => subject.type === "SCHOLASTIC",
  ).length;

  const firstItem = total === 0 ? 0 : (page - 1) * pageSize + 1;

  const lastItem = Math.min(page * pageSize, total);

  function previousPage() {
    if (page > 1) {
      setPage(page - 1);
    }
  }

  function nextPage() {
    if (page < totalPages) {
      setPage(page + 1);
    }
  }

  return (
    <div className="space-y-5">
      {/* ---------------------------------------------------------------- */}
      {/* Overview                                                         */}
      {/* ---------------------------------------------------------------- */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Subjects"
          value={total}
          description="Total subjects"
        />

        <StatCard
          icon={CheckCircle2}
          label="Active"
          value={active}
          description="Active on current page"
          tone="success"
        />

        <StatCard
          icon={XCircle}
          label="Inactive"
          value={inactive}
          description="Inactive on current page"
          tone="danger"
        />

        <StatCard
          icon={Layers3}
          label="Scholastic"
          value={scholastic}
          description="Scholastic on current page"
        />
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Table                                                             */}
      {/* ---------------------------------------------------------------- */}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <SubjectToolbar search={search} onSearch={setSearch} />

        <DataGrid columns={subjectColumns} data={subjects} loading={loading} />

        {/* -------------------------------------------------------------- */}
        {/* Pagination                                                     */}
        {/* -------------------------------------------------------------- */}

        {!loading && total > 0 && (
          <div className="flex flex-col gap-4 border-t border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Result count */}

            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-semibold text-foreground">{firstItem}</span>{" "}
              to{" "}
              <span className="font-semibold text-foreground">{lastItem}</span>{" "}
              of <span className="font-semibold text-foreground">{total}</span>{" "}
              subjects
            </p>

            {/* Controls */}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={previousPage}
                className="h-9 rounded-lg"
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>

              <div className="flex h-9 items-center rounded-lg border bg-muted/30 px-3 text-xs font-semibold">
                Page {page} of {totalPages}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={nextPage}
                className="h-9 rounded-lg"
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Empty state */}

        {!loading && total === 0 && (
          <div className="border-t border-border/60 px-5 py-8 text-center">
            <p className="text-sm font-semibold">No subjects found</p>

            <p className="mt-1 text-xs text-muted-foreground">
              Try changing your search or add a new subject.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
