"use client";

import { ColumnDef } from "@tanstack/react-table";

import { StatusBadge } from "@/components/common/badges";

import { PeriodActions } from "./components/PeriodActions";
import { PeriodListItem } from "./types";

export const periodColumns: ColumnDef<PeriodListItem>[] = [
  {
    accessorKey: "displayOrder",
    header: "#",
  },

  {
    accessorKey: "name",
    header: "Period",
  },

  {
    accessorKey: "startTime",
    header: "Start",
  },

  {
    accessorKey: "endTime",
    header: "End",
  },

  {
    accessorKey: "active",
    header: "Status",

    cell: ({ row }) => <StatusBadge active={row.original.active} />,
  },

  {
    id: "actions",

    cell: ({ row }) => <PeriodActions periodId={row.original.id} />,
  },
];
