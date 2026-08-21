"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { ChevronRight, Phone, UserRound } from "lucide-react";

import { StatusBadge } from "@/components/common/StatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StudentActions } from "./components/StudentActions";
import { StudentListItem } from "./types";

function getInitials(name: string | null) {
  if (!name) return "ST";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export const studentColumns: ColumnDef<StudentListItem>[] = [
  {
    accessorKey: "admissionNo",
    header: "Admission No",
    cell: ({ row }) => (
      <span className="inline-flex rounded-lg border border-border/60 bg-muted/50 px-2.5 py-1 font-mono text-xs font-semibold text-foreground">
        {row.original.admissionNo}
      </span>
    ),
  },

  {
    accessorKey: "fullName",
    header: "Student",
    cell: ({ row }) => {
      const student = row.original;
      const classSection = [student.className, student.sectionName]
        .filter(Boolean)
        .join(" · ");

      return (
        <Link
          href={`students/${student.id}`}
          className="group flex min-w-[220px] items-center gap-3"
        >
          <Avatar className="size-10 shrink-0 border border-primary/10 bg-primary/5 shadow-sm transition-transform duration-200 group-hover:scale-105">
            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
              {getInitials(student.fullName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="truncate font-semibold text-foreground transition-colors group-hover:text-primary">
                {student.fullName ?? "Unnamed student"}
              </p>

              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>

            {classSection && (
              <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                {classSection}
              </p>
            )}
          </div>
        </Link>
      );
    },
  },

  {
    accessorKey: "fatherName",
    header: "Parent / Guardian",
    cell: ({ row }) => (
      <div className="flex min-w-[160px] items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-muted">
          <UserRound className="size-3.5 text-muted-foreground" />
        </div>

        <span className="truncate text-sm font-medium text-foreground">
          {row.original.fatherName || "-"}
        </span>
      </div>
    ),
  },

  {
    accessorKey: "phone",
    header: "Contact",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Phone className="size-3.5 text-primary/70" />
        <span className="font-medium text-foreground/80">
          {row.original.phone || "-"}
        </span>
      </div>
    ),
  },

  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },

  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex justify-end">
        <StudentActions studentId={row.original.id} />
      </div>
    ),
  },
];
