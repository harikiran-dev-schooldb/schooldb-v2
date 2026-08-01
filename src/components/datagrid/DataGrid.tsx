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

import { getFilteredRowModel } from "@tanstack/react-table";
import { DataGridToolbar } from "./DataGridToolbar";

export function DataGrid<TData>({ columns, data }: DataGridProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const table = useReactTable({
    data,
    columns,

    state: {
      sorting,
      globalFilter: search,
    },

    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,

    getFilteredRowModel: getFilteredRowModel(),

    getCoreRowModel: getCoreRowModel(),

    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
      <DataGridToolbar onSearch={setSearch} />
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="h-12 bg-muted/40 px-5 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
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
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="h-16 px-5 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-40 text-center text-sm text-muted-foreground">
                No students found. Try another search or add your first student.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
