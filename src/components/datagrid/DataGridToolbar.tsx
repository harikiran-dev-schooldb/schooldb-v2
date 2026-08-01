"use client";

import { DataGridSearch } from "./DataGridSearch";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onSearch?: (value: string) => void;
};

export function DataGridToolbar({ onSearch }: Props) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <DataGridSearch placeholder="Search students..." onSearch={onSearch} />

      <Button variant="outline" size="sm" className="self-start sm:self-auto"><SlidersHorizontal /> Filters</Button>
    </div>
  );
}
