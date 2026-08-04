"use client";

import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";

import { SubjectListItem } from "./types";
import { SubjectActions } from "./components/SubjectActions";

export const subjectColumns: ColumnDef<SubjectListItem>[] = [
  {
    accessorKey: "name",
    header: "Subject",
  },

  {
    accessorKey: "code",
    header: "Code",
  },

  {
    accessorKey: "type",
    header: "Type",

    cell: ({ row }) => (
      <Badge variant="secondary">
        {row.original.type === "SCHOLASTIC" ? "Scholastic" : "Co-Scholastic"}
      </Badge>
    ),
  },

  {
    accessorKey: "displayOrder",
    header: "Order",
  },

  {
    accessorKey: "active",
    header: "Status",

    cell: ({ row }) => (
      <Badge variant={row.original.active ? "default" : "secondary"}>
        {row.original.active ? "Active" : "Inactive"}
      </Badge>
    ),
  },

  {
    id: "actions",

    cell: ({ row }) => <SubjectActions subjectId={row.original.id} />,
  },
];
