"use client";

import { ColumnDef } from "@tanstack/react-table";

import { ClassListItem } from "./types";
import { ClassActions } from "./components/ClassActions";

export const classColumns: ColumnDef<ClassListItem>[] = [
  {
    accessorKey: "displayOrder",
    header: "Order",
    cell: ({ row }) => (
      <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
        {row.original.displayOrder}
      </span>
    ),
  },
  {
    accessorKey: "name",
    header: "Class",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-semibold text-foreground">
          {row.original.name}
        </span>

        {row.original.description && (
          <span className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">
            {row.original.description}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) =>
      row.original.code ? (
        <span className="inline-flex rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {row.original.code}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <ClassActions classId={row.original.id} />,
  },
];
