"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Clock3, GripVertical } from "lucide-react";

import { StatusBadge } from "@/components/common/badges";

import { PeriodActions } from "./components/PeriodActions";
import { PeriodListItem } from "./types";

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time;
  }

  const date = new Date();

  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const periodColumns: ColumnDef<PeriodListItem>[] = [
  {
    accessorKey: "displayOrder",
    header: "Order",

    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <GripVertical className="size-4 text-muted-foreground/40" />

        <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-xs font-bold">
          {row.original.displayOrder}
        </span>
      </div>
    ),
  },

  {
    accessorKey: "name",
    header: "Period",

    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Clock3 className="size-4" />
        </div>

        <div>
          <p className="font-semibold">{row.original.name}</p>

          <p className="text-xs text-muted-foreground">
            Period {row.original.displayOrder}
          </p>
        </div>
      </div>
    ),
  },

  {
    id: "schedule",
    header: "Schedule",

    cell: ({ row }) => (
      <div>
        <p className="font-medium">
          {formatTime(row.original.startTime)}
          {" – "}
          {formatTime(row.original.endTime)}
        </p>

        <p className="mt-0.5 text-xs text-muted-foreground">
          {row.original.startTime} – {row.original.endTime}
        </p>
      </div>
    ),
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
