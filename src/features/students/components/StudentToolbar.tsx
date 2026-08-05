"use client";

import { CrudToolbar } from "@/components/common/crud/CrudToolbar";

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
    <CrudToolbar
      search={search}
      onSearch={onSearch}
      placeholder="Search students..."
    >
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
    </CrudToolbar>
  );
}
