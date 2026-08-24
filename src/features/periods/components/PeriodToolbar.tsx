"use client";

import { Clock3 } from "lucide-react";

import { CrudToolbar } from "@/components/common/crud";

type Props = {
  search: string;
  onSearch: (value: string) => void;
};

export function PeriodToolbar({ search, onSearch }: Props) {
  return (
    <div className="border-b bg-card">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Clock3 className="size-5" />
          </div>

          <div>
            <h2 className="text-sm font-semibold">Academic Periods</h2>

            <p className="text-xs text-muted-foreground">
              Configure the school&apos;s daily schedule.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t px-4 py-3">
        <CrudToolbar
          search={search}
          onSearch={onSearch}
          placeholder="Search periods..."
        />
      </div>
    </div>
  );
}
