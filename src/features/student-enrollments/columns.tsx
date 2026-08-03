"use client";

import { ColumnDef } from "@tanstack/react-table";

import { StatusBadge } from "@/components/common/StatusBadge";

import { StudentEnrollmentListItem } from "./types";
import { StudentEnrollmentActions } from "./components/StudentEnrollmentActions";

export const studentEnrollmentColumns: ColumnDef<StudentEnrollmentListItem>[] =
  [
    {
      accessorKey: "admissionNo",
      header: "Admission No",
    },
    {
      accessorKey: "studentName",
      header: "Student",
    },
    {
      accessorKey: "academicYearName",
      header: "Academic Year",
    },
    {
      accessorKey: "className",
      header: "Class",
    },
    {
      accessorKey: "sectionName",
      header: "Section",
    },
    {
      accessorKey: "rollNo",
      header: "Roll No",
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
