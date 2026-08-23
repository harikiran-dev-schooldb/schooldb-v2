"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  GraduationCap,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/common/badges";

import { HomeworkDetails as HomeworkDetailsType } from "../types";

type Props = {
  homeworkId: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getDueStatus(value: string | null | undefined) {
  if (!value) {
    return {
      label: "No due date",
      className: "text-muted-foreground",
    };
  }

  const dueDate = new Date(value);
  const today = new Date();

  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  if (dueDate < today) {
    return {
      label: "Overdue",
      className: "font-semibold text-destructive",
    };
  }

  if (dueDate.getTime() === today.getTime()) {
    return {
      label: "Due today",
      className: "font-semibold text-amber-600",
    };
  }

  return {
    label: "Upcoming",
    className: "font-semibold text-emerald-600",
  };
}

export function HomeworkDetails({ homeworkId }: Props) {
  const [data, setData] = useState<HomeworkDetailsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const response = await fetch(`/api/v1/homework/${homeworkId}`, {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          toast.error(result.message || "Failed to load homework.");
          return;
        }

        setData(result.data);
      } catch (error) {
        console.error("Failed to load homework:", error);
        toast.error("Failed to load homework.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [homeworkId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="animate-pulse rounded-2xl border bg-card p-6">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="mt-4 h-8 w-2/3 rounded bg-muted" />
          <div className="mt-3 h-4 w-full rounded bg-muted" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-xl border bg-muted/40"
            />
          ))}
        </div>

        <div className="h-48 animate-pulse rounded-2xl border bg-muted/40" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <ClipboardList className="mx-auto size-10 text-muted-foreground" />

        <p className="mt-3 font-semibold">Homework not found</p>

        <p className="mt-1 text-sm text-muted-foreground">
          The homework may have been deleted or is no longer available.
        </p>
      </div>
    );
  }

  const dueStatus = getDueStatus(data.dueDate);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Header */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <ClipboardList className="size-4" />
              Homework Assignment
            </div>

            <h1 className="break-words text-2xl font-bold tracking-tight">
              {data.title}
            </h1>
          </div>

          <StatusBadge active={data.active} />
        </div>
      </div>

      {/* Assignment information */}
      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard
          icon={<GraduationCap className="size-4" />}
          label="Class & Section"
          value={`${data.class.name} · ${data.section?.name ?? "All Sections"}`}
        />

        <InfoCard
          icon={<CalendarDays className="size-4" />}
          label="Assigned Date"
          value={formatDate(data.assignedDate)}
        />

        <InfoCard
          icon={<CalendarDays className="size-4" />}
          label="Due Date"
          value={
            <span className="flex flex-wrap items-center gap-2">
              {formatDate(data.dueDate)}

              <span className={dueStatus.className}>{dueStatus.label}</span>
            </span>
          }
        />

        {data.teacher && (
          <InfoCard
            icon={<UserRound className="size-4" />}
            label="Assigned By"
            value={data.teacher.fullName}
          />
        )}
      </div>

      {/* Instructions */}
      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-primary" />

            <h2 className="text-sm font-semibold">Homework Instructions</h2>
          </div>
        </div>

        <div className="px-6 py-5">
          {data.description ? (
            <p className="whitespace-pre-line text-sm leading-7">
              {data.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No instructions provided.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>

      <div className="mt-2 text-sm font-semibold">{value}</div>
    </div>
  );
}
