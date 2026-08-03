"use client";

import { ColumnDef } from "@tanstack/react-table";

import { StatusBadge } from "@/components/common/StatusBadge";

import { AcademicYearListItem } from "./types";
import { AcademicYearActions } from "./components/AcademicYearActions";

export const academicYearColumns: ColumnDef<AcademicYearListItem>[] = [
  {
    accessorKey: "name",
    header: "Academic Year",
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
    cell: ({ row }) => new Date(row.original.startDate).toLocaleDateString(),
  },
  {
    accessorKey: "endDate",
    header: "End Date",
    cell: ({ row }) => new Date(row.original.endDate).toLocaleDateString(),
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
      <AcademicYearActions
        academicYearId={row.original.id}
        active={row.original.active}
      />
    ),
  },
];
