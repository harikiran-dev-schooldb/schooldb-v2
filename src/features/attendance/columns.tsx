"use client";

import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";

import { AttendanceListItem } from "./types";

export const attendanceColumns: ColumnDef<AttendanceListItem>[] = [
  {
    accessorKey: "student.admissionNo",
    header: "Admission No",
  },

  {
    accessorKey: "student.fullName",
    header: "Student",
  },

  {
    accessorKey: "session.class.name",
    header: "Class",
  },

  {
    accessorKey: "session.section.name",
    header: "Section",
  },

  {
    accessorKey: "session.subject.name",
    header: "Subject",
  },

  {
    accessorKey: "session.period.name",
    header: "Period",
  },

  {
    accessorKey: "status",
    header: "Attendance",

    cell: ({ row }) => {
      const status = row.original.status;

      const variant =
        status === "PRESENT"
          ? "default"
          : status === "ABSENT"
            ? "destructive"
            : "secondary";

      return <Badge variant={variant}>{status}</Badge>;
    },
  },

  {
    accessorKey: "session.attendanceDate",
    header: "Date",

    cell: ({ row }) =>
      new Date(row.original.session.attendanceDate).toLocaleDateString(),
  },
];
