"use client";

import { DataGridSearch } from "@/components/datagrid/DataGridSearch";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { StudentStatus } from "@/generated/prisma/client";
import { STUDENT_STATUS_OPTIONS } from "../constants/student-status";

type Props = {
  search: string;
  onSearch: (value: string) => void;

  status: StudentStatus;
  onStatusChange: (value: StudentStatus) => void;
};

export function StudentToolbar({
  search,
  onSearch,
  status,
  onStatusChange,
}: Props) {
  return (
    <div className="flex items-center justify-between border-b p-4">
      <DataGridSearch
        placeholder="Search students..."
        value={search}
        onSearch={onSearch}
      />

      <div className="flex items-center gap-3">
        <Select
          value={status}
          onValueChange={(value) => onStatusChange(value as StudentStatus)}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            {STUDENT_STATUS_OPTIONS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
