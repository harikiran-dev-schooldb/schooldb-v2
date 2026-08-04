"use client";

import { ColumnDef } from "@tanstack/react-table";

import { StatusBadge } from "@/components/common/StatusBadge";

import { StudentEnrollmentListItem } from "./types";
import { StudentEnrollmentActions } from "./components/StudentEnrollmentActions";

export const studentEnrollmentColumns: ColumnDef<StudentEnrollmentListItem>[] =
  [
    {
      accessorKey: "rollNo",
      header: "Roll No",
    },
    {
      accessorKey: "admissionNo",
      header: "Admission No",
    },
    {
      id: "student",
      header: "Student",
      cell: ({ row }) => {
        const { studentName, className, sectionName } = row.original;

        return (
          <div>
            <div className="font-medium">{studentName}</div>
            <div className="text-xs text-muted-foreground">
              {className} - {sectionName}
            </div>
          </div>
        );
      },
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
        <StudentEnrollmentActions enrollmentId={row.original.id} />
      ),
    },
  ];
