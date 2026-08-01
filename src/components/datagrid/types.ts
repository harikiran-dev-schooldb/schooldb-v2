import { ColumnDef } from "@tanstack/react-table";

export interface DataGridProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];

  loading?: boolean;

  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;

  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
}