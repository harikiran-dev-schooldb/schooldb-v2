import {
  ColumnDef,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";

export interface DataGridProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];

  loading?: boolean;

  pageCount?: number;

  pagination?: PaginationState;

  onPaginationChange?: (pagination: PaginationState) => void;

  sorting?: SortingState;

  onSortingChange?: (sorting: SortingState) => void;

  searchPlaceholder?: string;

  onSearch?: (value: string) => void;

  toolbar?: React.ReactNode;
}