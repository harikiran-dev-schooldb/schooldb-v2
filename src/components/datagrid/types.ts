import { ColumnDef } from "@tanstack/react-table";

export interface DataGridProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
}