"use client";

import { CalendarDays, IndianRupee, LayoutDashboard } from "lucide-react";

import { AcademicYearSelect } from "@/components/common/select";

type Props = {
  academicYearId: string;
  onAcademicYearChange: (value: string) => void;
};

export function FeeDashboardHeader({
  academicYearId,
  onAcademicYearChange,
}: Props) {
  return (
    <div className="flex flex-col gap-5 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
      {/* Title */}

      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <LayoutDashboard className="size-6 text-primary" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Fee Dashboard</h1>

            <IndianRupee className="size-4 text-primary" />
          </div>

          <p className="mt-1.5 text-sm text-muted-foreground">
            Monitor fee collections, payments, and outstanding balances.
          </p>
        </div>
      </div>

      {/* Academic Year */}

      <div className="w-full sm:w-[240px]">
        <div className="mb-2 flex items-center gap-1.5">
          <CalendarDays className="size-3.5 text-muted-foreground" />

          <span className="text-xs font-medium text-muted-foreground">
            Academic Year
          </span>
        </div>

        <AcademicYearSelect
          value={academicYearId}
          onChange={onAcademicYearChange}
        />
      </div>
    </div>
  );
}
