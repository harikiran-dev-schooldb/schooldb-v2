"use client";

import { CalendarDays, GraduationCap } from "lucide-react";

import { CrudToolbar } from "@/components/common/crud";
import { Badge } from "@/components/ui/badge";

import { useHomeworkTable } from "../hooks/useHomeworkTable";
import type { HomeworkListItem } from "../types";
import { HomeworkActions } from "./HomeworkActions";
import { HomeworkStatusControl } from "./HomeworkStatusControl";

type Props = {
  className?: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "No due date";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function dueLabel(item: HomeworkListItem) {
  if (!item.active) return { label: "Archived", variant: "outline" as const };
  if (!item.dueDate) return { label: "Open", variant: "secondary" as const };

  const due = new Date(item.dueDate);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  if (due < today) return { label: "Overdue", variant: "destructive" as const };
  if (due.getTime() === today.getTime()) {
    return { label: "Due today", variant: "secondary" as const };
  }
  return { label: "Upcoming", variant: "outline" as const };
}

export function HomeworkTable({ className }: Props) {
  const { data, loading, search, setSearch, total } = useHomeworkTable();

  return (
    <section className={className}>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">
            Recent homework{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({total} total)
            </span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review, edit, publish, or archive class assignments.
          </p>
        </div>

        <div className="w-full sm:max-w-sm">
          <CrudToolbar
            search={search}
            onSearch={setSearch}
            placeholder="Search homework..."
          />
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-44 animate-pulse rounded-2xl border bg-card"
            />
          ))
        ) : data.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">
            {search
              ? "No homework matches your search."
              : "No homework yet. Create your first assignment above."}
          </div>
        ) : (
          data.map((item) => {
            const due = dueLabel(item);

            return (
              <article
                key={item.id}
                className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        <GraduationCap className="mr-1 size-3" />
                        {item.class.name}
                      </Badge>
                      <Badge variant="outline">
                        {item.section?.name ?? "All sections"}
                      </Badge>
                      <Badge variant={due.variant}>{due.label}</Badge>
                    </div>

                    <div>
                      <h3 className="break-words text-base font-bold sm:text-lg">
                        {item.title}
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/85">
                        {item.description || "No additional instructions."}
                      </p>
                    </div>
                  </div>

                  <HomeworkActions homeworkId={item.id} />
                </div>

                <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    <span>Assigned {formatDate(item.assignedDate)}</span>
                    <span aria-hidden="true">·</span>
                    <span>Due {formatDate(item.dueDate)}</span>
                  </p>

                  <HomeworkStatusControl
                    homeworkId={item.id}
                    title={item.title}
                    active={item.active}
                  />
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
