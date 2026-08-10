"use client";

import { ColumnDef } from "@tanstack/react-table";

import { StatusBadge } from "@/components/common/StatusBadge";

import { FeeCategoryListItem } from "./types";
import { FeeCategoryActions } from "./components/FeeCategoryActions";

export const feeCategoryColumns: ColumnDef<FeeCategoryListItem>[] = [
  {
    accessorKey: "name",
    header: "Fee Category",
  },

  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => row.original.code || "-",
  },

  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => row.original.description || "-",
  },

  {
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge status={row.original.active ? "ACTIVE" : "INACTIVE"} />
    ),
  },

  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <FeeCategoryActions
        feeCategoryId={row.original.id}
        active={row.original.active}
      />
    ),
  },
];
