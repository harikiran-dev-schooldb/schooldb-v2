"use client";

import { Filter } from "lucide-react";

import { CrudToolbar } from "@/components/common/crud";
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
      placeholder="Search by name or admission number..."
    >
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 px-1 text-[10px] font-bold tracking-[0.16em] text-muted-foreground uppercase lg:flex">
          <Filter className="size-3.5 text-primary" />
          Filter
        </div>

        <Select
          value={status}
          onValueChange={(value) => onStatusChange(value as StudentStatus)}
        >
          <SelectTrigger className="h-10 w-full min-w-40 rounded-xl border-border/70 bg-background/80 px-3 font-medium shadow-sm transition-all hover:border-primary/30 hover:bg-card focus:ring-primary/20 sm:w-44">
            <SelectValue placeholder="Student status" />
          </SelectTrigger>

          <SelectContent className="rounded-xl border-border/70 bg-popover/95 p-1.5 shadow-xl backdrop-blur-xl">
            {STUDENT_STATUS_OPTIONS.map((item) => (
              <SelectItem
                key={item.value}
                value={item.value}
                className="cursor-pointer rounded-lg py-2.5 font-medium"
              >
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </CrudToolbar>
  );
}
