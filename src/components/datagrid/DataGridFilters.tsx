"use client";

import type { StudentStatus } from "@/generated/prisma/client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  value: StudentStatus | "";
  onChange: (value: StudentStatus | "") => void;
};

export function DataGridFilters({ value, onChange }: Props) {
  return (
    <Select
      value={value || "ALL"}
      onValueChange={(nextValue) =>
        onChange(nextValue === "ALL" ? "" : (nextValue as StudentStatus))
      }
    >
      <SelectTrigger className="h-10 w-full rounded-xl border-border/70 bg-background shadow-sm sm:w-44">
        <SelectValue placeholder="Status" />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value="ALL">All Statuses</SelectItem>
        <SelectItem value="ACTIVE">Active</SelectItem>
        <SelectItem value="NOT_COMING">Not Coming</SelectItem>
        <SelectItem value="INACTIVE">Inactive</SelectItem>
        <SelectItem value="TC_ISSUED">TC Issued</SelectItem>
        <SelectItem value="DROPPED">Dropped</SelectItem>
        <SelectItem value="ALUMNI">Alumni</SelectItem>
      </SelectContent>
    </Select>
  );
}
