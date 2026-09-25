"use client";

import { CrudToolbar } from "@/components/common/crud";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

type Props = {
  search: string;
  onSearch: (value: string) => void;
  exportHref: string;
};

export function TeacherToolbar({ search, onSearch, exportHref }: Props) {
  return (
    <CrudToolbar
      search={search}
      onSearch={onSearch}
      placeholder="Search teachers..."
    >
      <Button asChild className="h-10 w-full px-4 sm:w-auto">
        <a href={exportHref}>
          <Download className="size-4" />
          Export Excel
        </a>
      </Button>
    </CrudToolbar>
  );
}
