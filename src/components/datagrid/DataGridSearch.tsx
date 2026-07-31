"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type Props = {
  placeholder?: string;
  onSearch?: (value: string) => void;
};

export function DataGridSearch({ placeholder, onSearch }: Props) {
  return (
    <div className="relative w-72">
      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

      <Input
        placeholder={placeholder}
        className="pl-9"
        onChange={(e) => onSearch?.(e.target.value)}
      />
    </div>
  );
}
