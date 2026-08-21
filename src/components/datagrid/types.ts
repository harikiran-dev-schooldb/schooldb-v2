import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";

export interface DataGridProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];

  loading?: boolean;

  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;

  toolbar?: ReactNode;

  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}