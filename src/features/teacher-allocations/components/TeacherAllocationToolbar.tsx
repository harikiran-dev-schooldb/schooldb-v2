"use client";

import { Input } from "@/components/ui/input";

import { AddTeacherAllocationButton } from "./AddTeacherAllocationButton";

type Props = {
  search: string;

  onSearchChange: (value: string) => void;
};

export function TeacherAllocationToolbar({ search, onSearchChange }: Props) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Input
        placeholder="Search allocations..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-sm"
      />

      <AddTeacherAllocationButton />
    </div>
  );
}
