"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {/* Search */}

          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSearch();
                }
              }}
              placeholder="Search student, admission no or receipt..."
              className="pl-9"
            />
          </div>

          {/* Payment Mode */}

          <select
            value={paymentMode}
            onChange={(event) => onPaymentModeChange(event.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">All Payment Modes</option>

            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="ONLINE">Online</option>
          </select>

          {/* From Date */}

          <Input
            type="date"
            value={fromDate}
            onChange={(event) => onFromDateChange(event.target.value)}
          />

          {/* To Date */}

          <Input
            type="date"
            value={toDate}
            onChange={(event) => onToDateChange(event.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={onSearch} disabled={loading}>
            {loading ? "Loading..." : "Search"}
          </Button>

          <Button variant="outline" onClick={onClear} disabled={loading}>
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
