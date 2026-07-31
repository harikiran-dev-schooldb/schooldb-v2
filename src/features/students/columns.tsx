"use client";
import { ColumnDef } from "@tanstack/react-table";
import { StudentListItem } from "./types";
import { StatusBadge } from "@/components/common/StatusBadge";
import { StudentActions } from "./components/StudentActions";

export const studentColumns: ColumnDef<StudentListItem>[] = [
  {
    accessorKey: "admissionNo",
    header: "Admission No",
  },
  {
    accessorKey: "fullName",
    header: "Student Name",
  },
  {
    accessorKey: "gender",
    header: "Gender",
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <StudentActions studentId={row.original.id} />,
  },
];
