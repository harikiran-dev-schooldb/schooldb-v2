"use client";

import { CalendarDays, Filter, Search, X } from "lucide-react";

import { AcademicYearSelect } from "@/components/common/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;

  academicYearId: string;
  onAcademicYearChange: (value: string) => void;

  paymentMode: string;
  onPaymentModeChange: (value: string) => void;

  fromDate: string;
  onFromDateChange: (value: string) => void;

  toDate: string;
  onToDateChange: (value: string) => void;

  onApply: () => void;
  onClear: () => void;

  loading?: boolean;
};

export function FeeReceiptsFilters({
  search,
  onSearchChange,
  academicYearId,
  onAcademicYearChange,
  paymentMode,
  onPaymentModeChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  onApply,
  onClear,
  loading = false,
}: Props) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 bg-card shadow-[0_8px_30px_rgba(15,23,42,0.045)]">
      {/* Header */}
      <div className="border-b border-border/60 bg-muted/20 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
            <Filter className="size-4 text-primary" />
          </div>

          <div>
            <p className="text-sm font-bold tracking-tight">Payment Filters</p>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Filter receipts by student, academic year, payment mode, or date.
            </p>
          </div>
        </div>
      </div>

      <CardContent className="space-y-5 p-5">
        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {/* Search */}
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onApply();
                }
              }}
              placeholder="Receipt, student or admission no..."
              className="h-10 rounded-xl border-border/70 bg-background pl-10 shadow-none transition-all focus-visible:ring-2"
            />
          </div>

          {/* Academic Year */}
          <div className="min-w-0">
            <AcademicYearSelect
              value={academicYearId}
              onChange={onAcademicYearChange}
            />
          </div>

          {/* Payment Mode */}
          <div className="min-w-0">
            <Select
              value={paymentMode || "ALL"}
              onValueChange={(value) =>
                onPaymentModeChange(value === "ALL" ? "" : value)
              }
            >
              <SelectTrigger className="h-10 w-full rounded-xl border-border/70 bg-background shadow-none">
                <SelectValue placeholder="Payment Mode" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="ALL">All Modes</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* From Date */}
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              type="date"
              value={fromDate}
              onChange={(event) => onFromDateChange(event.target.value)}
              className="h-10 rounded-xl border-border/70 bg-background pl-10 shadow-none"
              aria-label="From date"
            />
          </div>

          {/* To Date */}
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              type="date"
              value={toDate}
              onChange={(event) => onToDateChange(event.target.value)}
              className="h-10 rounded-xl border-border/70 bg-background pl-10 shadow-none"
              aria-label="To date"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Press{" "}
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-medium">
              Enter
            </kbd>{" "}
            to apply the search.
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClear}
              disabled={loading}
              className="h-9 rounded-xl px-4"
            >
              <X className="mr-2 size-3.5" />
              Clear
            </Button>

            <Button
              onClick={onApply}
              disabled={loading}
              className="h-9 rounded-xl px-5"
            >
              <Search className="mr-2 size-3.5" />

              {loading ? "Loading..." : "Apply Filters"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
