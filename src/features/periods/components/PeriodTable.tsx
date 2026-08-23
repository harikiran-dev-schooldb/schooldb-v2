"use client";

import { Clock3, ListOrdered } from "lucide-react";

import { DataGrid } from "@/components/datagrid/DataGrid";

import { periodColumns } from "../columns";
import { usePeriodTable } from "../hooks/usePeriodTable";

import { PeriodToolbar } from "./PeriodToolbar";

export function PeriodTable() {
  const { data, loading, search, setSearch } = usePeriodTable();

  const activeCount = data.filter((period) => period.active).length;

  return (
    <div className="space-y-5">
      {/* Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />

          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Periods
              </p>

              <p className="mt-2 text-3xl font-bold tracking-tight">
                {data.length}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Currently loaded
              </p>
            </div>

            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Clock3 className="size-5" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-emerald-500/5 blur-2xl" />

          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Active
              </p>

              <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-600">
                {activeCount}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Available for timetable
              </p>
            </div>

            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Clock3 className="size-5" />
            </div>
          </div>
        </div>

        <div className="group relative hidden overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md lg:block">
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-violet-500/5 blur-2xl" />

          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Schedule
              </p>

              <p className="mt-2 text-3xl font-bold tracking-tight">
                {data.length > 0 ? "Configured" : "Empty"}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Daily academic structure
              </p>
            </div>

            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
              <ListOrdered className="size-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <PeriodToolbar search={search} onSearch={setSearch} />

        <DataGrid columns={periodColumns} data={data} loading={loading} />
      </div>
    </div>
  );
}
