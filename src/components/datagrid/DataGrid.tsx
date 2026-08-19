"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

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
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-200/60 bg-white/80 shadow-xl shadow-slate-200/40 backdrop-blur-xl transition-all">
      {/* Toolbar Container */}
      {toolbar && (
        <div className="border-b border-slate-100 px-6 py-4">{toolbar}</div>
      )}

      <div className="w-full overflow-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-slate-100 hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-14 bg-slate-50/50 px-6 text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase transition-colors"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={`group flex items-center gap-2 ${
                          header.column.getCanSort()
                            ? "cursor-pointer select-none hover:text-slate-800"
                            : ""
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}

                        {/* Premium Sorting Indicators */}
                        {header.column.getCanSort() && (
                          <div className="flex items-center">
                            {{
                              asc: (
                                <ChevronUp className="size-3.5 text-teal-600 transition-transform" />
                              ),
                              desc: (
                                <ChevronDown className="size-3.5 text-teal-600 transition-transform" />
                              ),
                            }[header.column.getIsSorted() as string] ?? (
                              <ChevronsUpDown className="size-3.5 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {loading ? (
              /* Premium Skeleton Loading State */
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={rowIndex} className="border-b border-slate-50">
                  {columns.map((_, colIndex) => (
                    <TableCell key={colIndex} className="px-6 py-5">
                      <div className="h-4 w-full animate-pulse rounded-md bg-slate-100" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="group border-b border-slate-50 transition-colors hover:bg-slate-50/60 data-[state=selected]:bg-slate-50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="px-6 py-4 text-sm font-medium text-slate-700 group-hover:text-slate-900"
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
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48">
                  <DataGridEmpty />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Container */}
      <div className="border-t border-slate-100 bg-slate-50/30 px-6 py-3">
        <DataGridPagination
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange ?? (() => {})}
        />
      </div>
    </div>
  );
}
