"use client";

import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";

import { TeacherListItem } from "./types";
import { TeacherActions } from "./components/PeriodActions";

export const teacherColumns: ColumnDef<TeacherListItem>[] = [
  {
    accessorKey: "employeeId",
    header: "Employee ID",
  },

  {
    accessorKey: "fullName",
    header: "Teacher",
  },

  {
    accessorKey: "phone",
    header: "Phone",
  },

  {
    accessorKey: "designation",
    header: "Designation",
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

    cell: ({ row }) => <TeacherActions teacherId={row.original.id} />,
  },
];
