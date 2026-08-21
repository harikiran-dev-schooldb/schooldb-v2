"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";

import { DataGridEmpty } from "./DataGridEmpty";
import { DataGridPagination } from "./DataGridPagination";
import type { DataGridProps } from "./types";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function DataGrid<TData>({
  columns,
  data,
  loading = false,
  page = 1,
  totalPages = 1,
  onPageChange,
  toolbar,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: DataGridProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="premium-card overflow-hidden rounded-2xl">
      {/* Toolbar */}
      {toolbar && (
        <div className="border-b border-border/60 bg-card/50">{toolbar}</div>
      )}

      {/* Table */}
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-border/60 bg-muted/35 hover:bg-muted/35"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-12 whitespace-nowrap px-5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground md:px-6"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, rowIndex) => (
                <TableRow
                  key={`loading-row-${rowIndex}`}
                  className="border-border/40"
                >
                  {columns.map((_, columnIndex) => (
                    <TableCell
                      key={`loading-cell-${rowIndex}-${columnIndex}`}
                      className="px-5 py-4 md:px-6"
                    >
                      <div className="h-4 w-full max-w-[180px] animate-pulse rounded-md bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length > 0 ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="group border-border/40 transition-colors duration-150 hover:bg-primary/[0.025] data-[state=selected]:bg-primary/[0.05]"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="whitespace-nowrap px-5 py-4 text-sm text-foreground md:px-6"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  <DataGridEmpty
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="border-t border-border/60 bg-muted/[0.18] px-5 py-3.5 md:px-6">
          <DataGridPagination
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange ?? (() => undefined)}
          />
        </div>
      )}
    </div>
  );
}
