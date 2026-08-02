"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { StudentStatus } from "@/generated/prisma/client";

type Props = {
  value: StudentStatus | "";
  onChange: (value: StudentStatus | "") => void;
};

export function DataGridFilters({ value, onChange }: Props) {
  return (
    <Select
      value={value || "ALL"}
      onValueChange={(v) => onChange(v === "ALL" ? "" : (v as StudentStatus))}
    >
      <SelectTrigger className="w-44">
        <SelectValue placeholder="Status" />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value="ALL">All</SelectItem>
        <SelectItem value="ACTIVE">Active</SelectItem>
        <SelectItem value="INACTIVE">Inactive</SelectItem>
        <SelectItem value="TRANSFERRED">Transferred</SelectItem>
        <SelectItem value="DROPPED">Dropped</SelectItem>
        <SelectItem value="ALUMNI">Alumni</SelectItem>
      </SelectContent>
    </Select>
  );
}
