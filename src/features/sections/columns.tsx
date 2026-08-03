"use client";

import { ColumnDef } from "@tanstack/react-table";

import { SectionListItem } from "./types";
import { SectionActions } from "./components/SectionActions";

export const sectionColumns: ColumnDef<SectionListItem>[] = [
  {
    accessorKey: "className",
    header: "Class",
  },
  {
    accessorKey: "name",
    header: "Section",
  },
  {
    accessorKey: "displayOrder",
    header: "Order",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <SectionActions sectionId={row.original.id} />,
  },
];
