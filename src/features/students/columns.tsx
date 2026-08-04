"use client";
import { ColumnDef } from "@tanstack/react-table";
import { StudentListItem } from "./types";
import { StatusBadge } from "@/components/common/StatusBadge";
import { StudentActions } from "./components/StudentActions";
import Link from "next/link";

export const studentColumns: ColumnDef<StudentListItem>[] = [
  {
    accessorKey: "admissionNo",
    header: "Admission No",
  },
  {
    accessorKey: "fullName",
    header: "Student Name",
    cell: ({ row }) => (
      <Link
        href={`students/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.fullName ?? "Unnamed student"}
        {row.original.className && (
          <span className="text-muted-foreground">
            {` (${row.original.className}${row.original.sectionName ? ` - ${row.original.sectionName}` : ""})`}
          </span>
        )}
      </Link>
    ),
  },
  {
    accessorKey: "fatherName",
    header: "Parent Name",
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
    header: "Actions",
    cell: ({ row }) => <StudentActions studentId={row.original.id} />,
  },
];
