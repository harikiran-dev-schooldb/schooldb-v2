"use client";

import {
  CalendarDays,
  CreditCard,
  Filter,
  Loader2,
  RotateCcw,
  Search,
} from "lucide-react";

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
  paymentMode: string;
  fromDate: string;
  toDate: string;

  loading?: boolean;

  onSearchChange: (value: string) => void;
  onPaymentModeChange: (value: string) => void;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;

  onSearch: () => void;
  onClear: () => void;
};

const paymentModes = [
  {
    value: "CASH",
    label: "Cash",
  },
  {
    value: "UPI",
    label: "UPI",
  },
  {
    value: "CARD",
    label: "Card",
  },
  {
    value: "BANK_TRANSFER",
    label: "Bank Transfer",
  },
  {
    value: "ONLINE",
    label: "Online",
  },
  {
    value: "CHEQUE",
    label: "Cheque",
  },
];

export function PaymentHistoryFilters({
  search,
  paymentMode,
  fromDate,
  toDate,
  loading = false,
  onSearchChange,
  onPaymentModeChange,
  onFromDateChange,
  onToDateChange,
  onSearch,
  onClear,
}: Props) {
  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(paymentMode) ||
    Boolean(fromDate) ||
    Boolean(toDate);

  return (
    <Card className="premium-card overflow-hidden rounded-2xl border-0">
      {/* ================================================================ */}
      {/* FILTER HEADER                                                    */}
      {/* ================================================================ */}

      <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Filter className="size-4 text-primary" />
          </div>

          <div>
            <p className="text-sm font-bold tracking-tight">Search & Filters</p>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Find payments by student, receipt, mode, or date.
            </p>
          </div>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={loading}
            className="w-fit rounded-xl text-xs text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <RotateCcw className="mr-2 size-3.5" />
            Clear filters
          </Button>
        )}
      </div>

      {/* ================================================================ */}
      {/* FILTER CONTROLS                                                  */}
      {/* ================================================================ */}

      <CardContent className="p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {/* Search */}
          <div className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSearch();
                }
              }}
              placeholder="Student, admission no. or receipt..."
              className="h-10 rounded-xl border-border/70 bg-background shadow-none pl-10"
            />
          </div>

          {/* Payment Mode */}
          <div className="relative">
            <CreditCard className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />

            <Select
              value={paymentMode || "ALL"}
              onValueChange={(value) =>
                onPaymentModeChange(value === "ALL" ? "" : value)
              }
            >
              <SelectTrigger className="h-10 rounded-xl border-border/70 bg-background pl-10 shadow-none">
                <SelectValue placeholder="Payment Mode" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="ALL">All Payment Modes</SelectItem>

                {paymentModes.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* From Date */}
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

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
            <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              type="date"
              value={toDate}
              onChange={(event) => onToDateChange(event.target.value)}
              className="h-10 rounded-xl border-border/70 bg-background pl-10 shadow-none"
              aria-label="To date"
            />
          </div>

          {/* Search */}
          <Button
            onClick={onSearch}
            disabled={loading}
            className="h-10 rounded-xl px-5"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Search className="mr-2 size-4" />
                Search
              </>
            )}
          </Button>
        </div>

        {/* Active filter indicator */}
        {hasActiveFilters && (
          <div className="mt-5 flex items-center gap-2 border-t border-border/60 pt-4">
            <span className="size-1.5 rounded-full bg-primary" />

            <p className="text-xs text-muted-foreground">
              Filters are active. Search results reflect your selected criteria.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
