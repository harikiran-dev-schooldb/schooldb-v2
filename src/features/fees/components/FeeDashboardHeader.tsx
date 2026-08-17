"use client";

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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold">Fee Dashboard</h1>

        <p className="text-sm text-muted-foreground">
          Fee collection and outstanding summary
        </p>
      </div>

      <div className="w-full sm:w-[220px]">
        <AcademicYearSelect
          value={academicYearId}
          onChange={onAcademicYearChange}
        />
      </div>
    </div>
  );
}
