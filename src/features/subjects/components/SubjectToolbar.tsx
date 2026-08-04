"use client";

import { Input } from "@/components/ui/input";

import { AddSubjectButton } from "./AddSubjectButton";

type Props = {
  search: string;

  onSearchChange: (value: string) => void;
};

export function SubjectToolbar({ search, onSearchChange }: Props) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Input
        placeholder="Search subjects..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-sm"
      />

      <AddSubjectButton />
    </div>
  );
}
