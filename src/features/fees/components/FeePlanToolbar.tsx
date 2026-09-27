"use client";

import { Filter, X } from "lucide-react";

import { CrudToolbar } from "@/components/common/crud";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = {
  id: string;
  label: string;
};

type Props = {
  search: string;
  onSearch: (value: string) => void;
  academicYearId: string;
  onAcademicYearChange: (value: string) => void;
  academicYearOptions: Option[];
  classId: string;
  onClassChange: (value: string) => void;
  classOptions: Option[];
  frequency: string;
  onFrequencyChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
};

const frequencyOptions = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "HALF_YEARLY", label: "Half Yearly" },
  { value: "TERMLY", label: "Termly" },
  { value: "ANNUAL", label: "Annual" },
  { value: "CUSTOM", label: "Custom" },
];

function normalizeFilter(value: string) {
  return value === "ALL" ? "" : value;
}

export function FeePlanToolbar({
  search,
  onSearch,
  academicYearId,
  onAcademicYearChange,
  academicYearOptions,
  classId,
  onClassChange,
  classOptions,
  frequency,
  onFrequencyChange,
  status,
  onStatusChange,
  onClearFilters,
  hasActiveFilters,
}: Props) {
  const triggerClassName =
    "h-10 w-full min-w-36 rounded-xl border-border/70 bg-background/80 sm:w-40";

  return (
    <CrudToolbar
      search={search}
      onSearch={onSearch}
      placeholder="Search fee plans..."
    >
      <div className="hidden items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground xl:flex">
        <Filter className="size-3.5 text-primary" />
        Filter
      </div>

      <Select
        value={academicYearId || "ALL"}
        onValueChange={(value) => onAcademicYearChange(normalizeFilter(value))}
      >
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder="All Academic Years" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Academic Years</SelectItem>
          {academicYearOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={classId || "ALL"}
        onValueChange={(value) => onClassChange(normalizeFilter(value))}
      >
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder="All Classes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Classes</SelectItem>
          {classOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={frequency || "ALL"}
        onValueChange={(value) => onFrequencyChange(normalizeFilter(value))}
      >
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder="All Frequencies" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Frequencies</SelectItem>
          {frequencyOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={status || "ALL"}
        onValueChange={(value) => onStatusChange(normalizeFilter(value))}
      >
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Statuses</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="INACTIVE">Inactive</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 w-full rounded-xl px-3 sm:w-auto"
          onClick={onClearFilters}
        >
          <X className="size-4" />
          Clear
        </Button>
      )}
    </CrudToolbar>
  );
}
