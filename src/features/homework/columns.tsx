"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CalendarDays, Clock3, GraduationCap } from "lucide-react";

import { StatusBadge } from "@/components/common/badges";

import { HomeworkActions } from "./components/HomeworkActions";
import { HomeworkListItem } from "./types";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getDueState(value: string | null | undefined) {
  if (!value) return "none";

  const due = new Date(value);
  const today = new Date();

  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  if (due < today) return "overdue";
  if (due.getTime() === today.getTime()) return "today";

  return "upcoming";
}

export const homeworkColumns = (
  reload: () => void,
): ColumnDef<HomeworkListItem>[] => [
  /* ================================================================ */
  /* HOMEWORK                                                         */
  /* ================================================================ */

  {
    accessorKey: "title",
    header: "Homework",

    cell: ({ row }) => {
      const homework = row.original;

      return (
        <div className="min-w-[240px] max-w-[380px]">
          <div className="font-semibold leading-5 text-foreground">
            {homework.title}
          </div>

          {homework.description ? (
            <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {homework.description}
            </div>
          ) : (
            <div className="mt-1 text-xs italic text-muted-foreground">
              No description
            </div>
          )}
        </div>
      );
    },
  },

  /* ================================================================ */
  /* CLASS / SECTION                                                  */
  /* ================================================================ */

  {
    id: "classSection",
    header: "Class",

    cell: ({ row }) => {
      const homework = row.original;

      return (
        <div className="flex min-w-[130px] items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <GraduationCap className="size-4" />
          </div>

          <div>
            <div className="font-medium">
              {homework.class?.name ?? "—"}
              {" - "}
              {homework.section?.name ?? "All Sections"}
            </div>

            <div className="text-xs text-muted-foreground"></div>
          </div>
        </div>
      );
    },
  },

  /* ================================================================ */
  /* ASSIGNED DATE                                                    */
  /* ================================================================ */

  {
    accessorKey: "assignedDate",
    header: "Assigned",

    cell: ({ row }) => (
      <div className="flex items-center gap-2 whitespace-nowrap text-sm">
        <CalendarDays className="size-3.5 text-muted-foreground" />

        <span>{formatDate(row.original.assignedDate)}</span>
      </div>
    ),
  },

  /* ================================================================ */
  /* DUE DATE                                                         */
  /* ================================================================ */

  {
    accessorKey: "dueDate",
    header: "Due",

    cell: ({ row }) => {
      const dueDate = row.original.dueDate;
      const state = getDueState(dueDate);

      if (!dueDate) {
        return (
          <span className="text-sm text-muted-foreground">No due date</span>
        );
      }

      if (state === "overdue") {
        return (
          <div className="min-w-[105px]">
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <Clock3 className="size-3.5" />
              {formatDate(dueDate)}
            </div>

            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
              Overdue
            </div>
          </div>
        );
      }

      if (state === "today") {
        return (
          <div className="min-w-[105px]">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
              <Clock3 className="size-3.5" />
              {formatDate(dueDate)}
            </div>

            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
              Due Today
            </div>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
          <Clock3 className="size-3.5" />
          {formatDate(dueDate)}
        </div>
      );
    },
  },

  /* ================================================================ */
  /* STATUS                                                           */
  /* ================================================================ */

  {
    accessorKey: "active",
    header: "Status",

    cell: ({ row }) => <StatusBadge active={row.original.active} />,
  },

  /* ================================================================ */
  /* ACTIONS                                                          */
  /* ================================================================ */

  {
    id: "actions",
    header: "",
    enableSorting: false,

    cell: ({ row }) => (
      <div className="flex justify-end">
        <HomeworkActions homeworkId={row.original.id} onSuccess={reload} />
      </div>
    ),
  },
];
