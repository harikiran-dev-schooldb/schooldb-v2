"use client";

import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  rows?: number;
};

export function TableSkeleton({ rows = 8 }: Props) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}
