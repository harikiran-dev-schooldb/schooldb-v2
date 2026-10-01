"use client";

import { ColumnDef } from "@tanstack/react-table";

import { SectionListItem } from "./types";
import { SectionActions } from "./components/SectionActions";

export const sectionColumns: ColumnDef<SectionListItem>[] = [
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
    accessorKey: "className",
    header: "Class",
    cell: ({ row }) => (
      <span className="font-semibold text-foreground">
        {row.original.className}
      </span>
    ),
  },
  {
    accessorKey: "name",
    header: "Section",
    cell: ({ row }) => (
      <span className="inline-flex rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
        {row.original.name}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <SectionActions sectionId={row.original.id} />,
  },
];
