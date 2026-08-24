"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { BookOpen, GraduationCap } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { SubjectListItem } from "./types";
import { SubjectActions } from "./components/SubjectActions";

export const subjectColumns: ColumnDef<SubjectListItem>[] = [
  {
    accessorKey: "displayOrder",
    header: "SNo",

    cell: ({ row }) => (
      <span className="inline-flex size-8 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
        {row.original.displayOrder}
      </span>
    ),
  },
  {
    accessorKey: "name",
    header: "Subject",

    cell: ({ row }) => {
      const subject = row.original;

      return (
        <div className="flex min-w-[220px] items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="size-4.5" />
          </div>

          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {subject.name}
            </p>

            <p className="mt-0.5 text-xs text-muted-foreground">
              {subject.code || "No subject code"}
            </p>
          </div>
        </div>
      );
    },
  },

  {
    accessorKey: "code",
    header: "Code",

    cell: ({ row }) => {
      const code = row.original.code;

      return code ? (
        <span className="rounded-lg border bg-muted/40 px-2.5 py-1 font-mono text-xs font-medium">
          {code}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      );
    },
  },

  {
    accessorKey: "type",
    header: "Category",

    cell: ({ row }) => {
      const scholastic = row.original.type === "SCHOLASTIC";

      return (
        <Badge
          variant="outline"
          className={
            scholastic
              ? "gap-1.5 border-primary/20 bg-primary/5 text-primary"
              : "gap-1.5 border-violet-500/20 bg-violet-500/5 text-violet-600"
          }
        >
          {scholastic ? (
            <GraduationCap className="size-3.5" />
          ) : (
            <BookOpen className="size-3.5" />
          )}

          {scholastic ? "Scholastic" : "Co-Scholastic"}
        </Badge>
      );
    },
  },

  {
    accessorKey: "active",
    header: "Status",

    cell: ({ row }) => {
      const active = row.original.active;

      return (
        <Badge
          variant="outline"
          className={
            active
              ? "gap-1.5 border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
              : "gap-1.5 border-border bg-muted/50 text-muted-foreground"
          }
        >
          <span
            className={[
              "size-1.5 rounded-full",
              active ? "bg-emerald-500" : "bg-muted-foreground/50",
            ].join(" ")}
          />

          {active ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },

  {
    id: "actions",
    header: "",

    cell: ({ row }) => (
      <div className="flex justify-end">
        <SubjectActions subjectId={row.original.id} />
      </div>
    ),
  },
];
