"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { ChevronRight, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { TeacherListItem } from "./types";
import { TeacherActions } from "./components/TeacherActions";

export const teacherColumns: ColumnDef<TeacherListItem>[] = [
  {
    accessorKey: "employeeId",
    header: "Employee ID",
    cell: ({ row }) => (
      <span className="inline-flex rounded-lg border border-border/60 bg-muted/50 px-2.5 py-1 font-mono text-xs font-semibold text-foreground">
        {row.original.employeeId}
      </span>
    ),
  },
  {
    accessorKey: "fullName",
    header: "Teacher",
    cell: ({ row }) => {
      const teacher = row.original;
      const initials = teacher.fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();

      return (
        <Link
          href={`teachers/${teacher.id}`}
          className="group flex min-w-[230px] items-center gap-3"
        >
          <Avatar className="size-10 border border-primary/10 bg-primary/5 shadow-sm transition-transform group-hover:scale-105">
            {teacher.imageUrl ? (
              <AvatarImage src={teacher.imageUrl} alt="" />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
              {initials || "TC"}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="truncate font-semibold text-foreground transition-colors group-hover:text-primary">
                {teacher.fullName || "Unnamed teacher"}
              </p>
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
              {teacher.designation || teacher.qualification || "Teaching staff"}
            </p>
          </div>
        </Link>
      );
    },
  },
  {
    accessorKey: "phone",
    header: "Phone",
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
