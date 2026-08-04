"use client";

import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";

import { TeacherAllocationListItem } from "./types";

import { TeacherAllocationActions } from "./components/TeacherAllocationActions";

export const teacherAllocationColumns: ColumnDef<TeacherAllocationListItem>[] =
  [
    {
      accessorKey: "academicYearName",
      header: "Academic Year",
    },

    {
      accessorKey: "teacherName",
      header: "Teacher",
    },

    {
      accessorKey: "subjectName",
      header: "Subject",
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

      cell: ({ row }) => (
        <TeacherAllocationActions allocationId={row.original.id} />
      ),
    },
  ];
