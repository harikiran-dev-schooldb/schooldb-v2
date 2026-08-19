"use client";

import { ColumnDef } from "@tanstack/react-table";

import { SectionListItem } from "./types";
import { SectionActions } from "./components/SectionActions";

export const sectionColumns: ColumnDef<SectionListItem>[] = [
  {
    accessorKey: "displayOrder",
    header: "Order",
  },
  {
    accessorKey: "className",
    header: "Class",
  },
  {
    accessorKey: "name",
    header: "Section",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <SectionActions sectionId={row.original.id} />,
  },
];
