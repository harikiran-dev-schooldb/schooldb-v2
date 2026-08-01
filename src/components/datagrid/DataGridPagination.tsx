"use client";

import { Button } from "@/components/ui/button";

type Props = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function DataGridPagination({ page, totalPages, onPageChange }: Props) {
  return (
    <div className="flex items-center justify-between border-t p-4">
      <Button
        variant="outline"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>

      <span className="text-sm text-muted-foreground">
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
