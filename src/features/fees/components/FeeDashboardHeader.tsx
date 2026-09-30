"use client";

import { CalendarDays } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
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
    <PageHeader
      eyebrow="Fees"
      title="Fee Dashboard"
      description="Monitor fee collections, payments, and outstanding balances."
      action={
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
      }
    />
  );
}
