"use client";

import { ColumnDef } from "@tanstack/react-table";

import { StatusBadge } from "@/components/common/badges";

import { HomeworkActions } from "./components/HomeworkActions";
import { HomeworkListItem } from "./types";

export const homeworkColumns = (
  reload: () => void,
): ColumnDef<HomeworkListItem>[] => [
  {
    accessorKey: "assignedDate",
    header: "Assigned",
    cell: ({ row }) => new Date(row.original.assignedDate).toLocaleDateString(),
  },

  {
    accessorKey: "class.name",
    header: "Class",
    cell: ({ row }) => row.original.class?.name ?? "-",
  },

  {
    accessorKey: "section.name",
    header: "Section",
    cell: ({ row }) => row.original.section?.name ?? "All Sections",
  },

  {
    accessorKey: "title",
    header: "Title",
  },

  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <div className="max-w-md whitespace-pre-line">
        {row.original.description || "-"}
      </div>
    ),
  },

  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) =>
      row.original.dueDate
        ? new Date(row.original.dueDate).toLocaleDateString()
        : "-",
  },

  {
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) => <StatusBadge active={row.original.active} />,
  },

  {
    id: "actions",
    cell: ({ row }) => (
      <HomeworkActions homeworkId={row.original.id} onSuccess={reload} />
    ),
  },
];
