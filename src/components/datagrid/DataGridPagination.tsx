"use client";

import { Button } from "@/components/ui/button";

type Props = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function DataGridPagination({ page, totalPages, onPageChange }: Props) {
  return (
    <div className="flex items-center justify-between border-t border-border/70 bg-card p-4 md:px-5">
      <Button
        variant="outline"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>

      <span className="text-xs font-medium tracking-wide text-muted-foreground">
        Page {page} of {totalPages}
      </span>

      <Button
        variant="outline"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
