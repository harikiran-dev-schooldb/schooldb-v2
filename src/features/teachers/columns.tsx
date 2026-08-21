"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

import { TeacherListItem } from "./types";
import { TeacherActions } from "./components/TeacherActions";

export const teacherColumns: ColumnDef<TeacherListItem>[] = [
  {
    accessorKey: "employeeId",
    header: "Employee ID",
  },
  {
    accessorKey: "fullName",
    header: "Teacher",
    cell: ({ row }) => (
      <div className="font-medium text-foreground">
        {row.original.fullName || "Unnamed teacher"}
      </div>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.phone || "-"}</span>
    ),
  },
  {
    accessorKey: "designation",
    header: "Designation",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.designation || "-"}
      </span>
    ),
  },
  {
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) =>
      row.original.active ? (
        <Badge className="border-0 bg-emerald-100 font-medium text-emerald-700 hover:bg-emerald-100">
          Active
        </Badge>
      ) : (
        <Badge variant="secondary" className="font-medium">
          Inactive
        </Badge>
      ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <TeacherActions teacherId={row.original.id} />,
  },
];
