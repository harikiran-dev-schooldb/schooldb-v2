"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";

import { useState } from "react";

import { DataGridProps } from "./types";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataGridEmpty } from "./DataGridEmpty";
import { DataGridPagination } from "./DataGridPagination";

export function DataGrid<TData>({
  columns,
  data,
  loading = false,
  page = 1,
  totalPages = 1,
  onPageChange,
  toolbar,
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

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
      {toolbar}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="h-12 bg-muted/40 px-5 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase"
                >
                  {header.isPlaceholder ? null : (
                    <button
                      type="button"
                      className="flex cursor-pointer select-none items-center gap-2 hover:text-foreground"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}

                      {header.column.getIsSorted() === "asc" && "↑"}

                      {header.column.getIsSorted() === "desc" && "↓"}
                    </button>
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-32 text-center">
                Loading...
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <DataGridEmpty />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <DataGridPagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange ?? (() => {})}
      />
    </div>
  );
}
