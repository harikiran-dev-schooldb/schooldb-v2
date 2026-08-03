"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ClassListItem } from "./types";
import { ClassActions } from "./components/SectionActions";

export const classColumns: ColumnDef<ClassListItem>[] = [
  {
    accessorKey: "name",
    header: "Class",
  },
  {
    accessorKey: "code",
    header: "Code",
  },
  {
    accessorKey: "displayOrder",
    header: "Order",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <ClassActions classId={row.original.id} />,
  },
];
