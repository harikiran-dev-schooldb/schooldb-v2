"use client";

import { Search } from "lucide-react";

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
  loading,
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
                  onApply();
                }
              }}
              placeholder="Receipt, student or admission no..."
              className="pl-9"
            />
          </div>

          {/* Academic Year */}

          <AcademicYearSelect
            value={academicYearId}
            onChange={onAcademicYearChange}
          />

          {/* Payment Mode */}

          <Select
            value={paymentMode || "ALL"}
            onValueChange={(value) =>
              onPaymentModeChange(value === "ALL" ? "" : value)
            }
          >
            <SelectTrigger>
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

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClear} disabled={loading}>
            Clear
          </Button>

          <Button onClick={onApply} disabled={loading}>
            {loading ? "Loading..." : "Apply Filters"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
