"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";

import { feePlanColumns } from "../fee-plan-columns";

import { useFeePlanTable } from "./hooks/useFeePlanTable";
import { FeePlanToolbar } from "./FeePlanToolbar";

export function FeePlanTable() {
  const {
    feePlans,
    loading,
    search,
    setSearch,
    academicYearId,
    setAcademicYearId,
    academicYearOptions,
    classId,
    setClassId,
    classOptions,
    frequency,
    setFrequency,
    status,
    setStatus,
    clearFilters,
    hasActiveFilters,
  } = useFeePlanTable();

  return (
    <DataGrid
      columns={feePlanColumns}
      data={feePlans}
      loading={loading}
      toolbar={
        <FeePlanToolbar
          search={search}
          onSearch={setSearch}
          academicYearId={academicYearId}
          onAcademicYearChange={setAcademicYearId}
          academicYearOptions={academicYearOptions}
          classId={classId}
          onClassChange={setClassId}
          classOptions={classOptions}
          frequency={frequency}
          onFrequencyChange={setFrequency}
          status={status}
          onStatusChange={setStatus}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      }
    />
  );
}
