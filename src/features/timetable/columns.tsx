"use client";

import { ColumnDef } from "@tanstack/react-table";

import { StatusBadge } from "@/components/common/badges";

import { TimetableActions } from "./components/TimetableActions";
import { TakeAttendanceButton } from "@/features/attendance/components/TakeAttendanceButton";

import { TimetableListItem } from "./types";

export const timetableColumns: ColumnDef<TimetableListItem>[] = [
  {
    accessorKey: "day",
    header: "Day",
  },

  {
    accessorKey: "period",
    header: "Period",
  },

  {
    accessorKey: "teacher",
    header: "Teacher",
  },

  {
    accessorKey: "subject",
    header: "Subject",
  },

  {
    accessorKey: "class",
    header: "Class",
  },

  {
    accessorKey: "section",
    header: "Section",
  },

  {
    accessorKey: "active",

    header: "Status",

    cell: ({ row }) => <StatusBadge active={row.original.active} />,
  },

  // ⭐ Attendance Button
  {
    id: "attendance",

    header: "Attendance",

    cell: ({ row }) => <TakeAttendanceButton timetableId={row.original.id} />,
  },

  {
    id: "actions",

    cell: ({ row }) => <TimetableActions timetableId={row.original.id} />,
  },
];
