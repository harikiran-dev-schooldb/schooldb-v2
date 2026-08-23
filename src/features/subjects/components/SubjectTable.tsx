"use client";

import { BookOpen, CheckCircle2, Layers3, XCircle } from "lucide-react";

import { DataGrid } from "@/components/datagrid/DataGrid";

import { subjectColumns } from "../columns";
import { useSubjectTable } from "../hooks/useSubjectTable";
import { SubjectToolbar } from "./SubjectToolbar";

function StatCard({
  icon: Icon,
  label,
  value,
  description,
  tone = "default",
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
  description: string;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>

          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>

        <div
          className={[
            "flex size-10 items-center justify-center rounded-xl",
            tone === "success"
              ? "bg-emerald-500/10 text-emerald-600"
              : tone === "danger"
                ? "bg-red-500/10 text-red-600"
                : "bg-primary/10 text-primary",
          ].join(" ")}
        >
          <Icon className="size-5" />
        </div>
      </div>

      <div className="pointer-events-none absolute -bottom-8 -right-8 size-24 rounded-full bg-primary/[0.025] transition-transform duration-300 group-hover:scale-125" />
    </div>
  );
}

export function SubjectTable() {
  const { subjects, loading, search, setSearch } = useSubjectTable();

  const total = subjects.length;
  const active = subjects.filter((subject) => subject.active).length;
  const inactive = subjects.filter((subject) => !subject.active).length;

  const scholastic = subjects.filter(
    (subject) => subject.type === "SCHOLASTIC",
  ).length;

  return (
    <div className="space-y-5">
      {/* Overview */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Subjects"
          value={total}
          description="Total subjects"
        />

        <StatCard
          icon={CheckCircle2}
          label="Active"
          value={active}
          description="Currently available"
          tone="success"
        />

        <StatCard
          icon={XCircle}
          label="Inactive"
          value={inactive}
          description="Currently disabled"
          tone="danger"
        />

        <StatCard
          icon={Layers3}
          label="Scholastic"
          value={scholastic}
          description="Academic subjects"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <SubjectToolbar search={search} onSearch={setSearch} />

        <DataGrid columns={subjectColumns} data={subjects} loading={loading} />
      </div>
    </div>
  );
}
