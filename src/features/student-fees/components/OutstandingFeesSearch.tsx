"use client";

import type { ReactNode } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AcademicYearSelect,
  ClassSelect,
  SectionSelect,
} from "@/components/common/select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  value: string;
  loading?: boolean;
  onChange: (value: string) => void;
  academicYearId: string;
  installmentName: string;
  installmentOptions: string[];
  classId: string;
  sectionId: string;
  onAcademicYearChange: (value: string) => void;
  onInstallmentChange: (value: string) => void;
  onClassChange: (value: string) => void;
  onSectionChange: (value: string) => void;
  onSearch: () => void;
};

export function OutstandingFeesSearch({
  value,
  loading = false,
  onChange,
  academicYearId,
  installmentName,
  installmentOptions,
  classId,
  sectionId,
  onAcademicYearChange,
  onInstallmentChange,
  onClassChange,
  onSectionChange,
  onSearch,
}: Props) {
  return (
    <Card className="w-full overflow-hidden rounded-2xl border-border/60 bg-card shadow-[0_8px_30px_rgba(15,23,42,0.045)]">
      <CardContent className="p-0">
        {/* Header */}
        <div className="border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <SlidersHorizontal className="size-4" />
            </div>

            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground">
                Find Outstanding Fees
              </h2>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Filter dues by academic year, installment, class, or student.
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FilterField label="Academic year">
              <AcademicYearSelect
                value={academicYearId}
                onChange={onAcademicYearChange}
                disabled={loading}
              />
            </FilterField>

            <FilterField label="Installment">
              <Select
                value={installmentName || "all"}
                onValueChange={(value) =>
                  onInstallmentChange(value === "all" ? "" : value)
                }
                disabled={loading || !academicYearId}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="All installments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All installments</SelectItem>
                  {installmentOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="Class">
              <ClassSelect
                value={classId}
                onChange={onClassChange}
                allowAll
                placeholder="All Classes"
                triggerClassName="h-11 rounded-xl"
              />
            </FilterField>

            <FilterField label="Section">
              <SectionSelect
                classId={classId}
                value={sectionId}
                onChange={onSectionChange}
                placeholder="All Sections"
                triggerClassName="h-11 rounded-xl"
              />
            </FilterField>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <FilterField label="Student or admission number" className="min-w-0 flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={value}
                  onChange={(event) => onChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onSearch();
                    }
                  }}
                  placeholder="Search student or admission number..."
                  className="h-11 rounded-xl border-border/70 bg-background pl-11 shadow-none transition-all focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </div>
            </FilterField>

            <Button
              onClick={onSearch}
              disabled={loading}
              className="h-11 rounded-xl px-6 sm:min-w-32"
            >
              <Search className="mr-2 size-4" />

              {loading ? "Applying..." : "Apply filters"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 text-xs font-semibold text-foreground">{label}</div>
      {children}
    </div>
  );
}
