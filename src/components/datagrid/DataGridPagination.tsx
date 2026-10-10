"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  page: number;
  pageSize?: number;
  totalItems?: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function DataGridPagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
}: Props) {
  const first = pageSize ? (page - 1) * pageSize + 1 : null;
  const last = pageSize && totalItems !== undefined
    ? Math.min(page * pageSize, totalItems)
    : null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-medium text-muted-foreground">
        {first !== null && last !== null && totalItems !== undefined ? (
          <>
            Showing <span className="font-semibold text-foreground">{first}–{last}</span> of{" "}
            <span className="font-semibold text-foreground">{totalItems}</span>
          </>
        ) : (
          <>
            Page <span className="font-semibold text-foreground">{page}</span> of{" "}
            <span className="font-semibold text-foreground">{totalPages}</span>
          </>
        )}
      </p>

      {totalPages > 1 && (
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="h-9 w-full rounded-xl px-3 sm:w-auto"
          >
            <ChevronLeft className="mr-1 size-4" />
            Previous
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="h-9 w-full rounded-xl px-3 sm:w-auto"
          >
            Next
            <ChevronRight className="ml-1 size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
