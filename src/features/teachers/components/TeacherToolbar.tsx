"use client";

import { Input } from "@/components/ui/input";

import { AddTeacherButton } from "./AddTeacherButton";

type Props = {
  search: string;

  onSearchChange: (value: string) => void;
};

export function TeacherToolbar({ search, onSearchChange }: Props) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Input
        placeholder="Search teachers..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-sm"
      />

      <AddTeacherButton />
    </div>
  );
}
