"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  AlertOctagon,
  CircleDollarSign,
  ClipboardCheck,
  ListChecks,
  Search,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedSwitch } from "@/components/ui/segmented-switch";
import { cn } from "@/lib/utils";
import {
  EmptyPanel,
  Field,
  formatCurrency,
  formatDate,
  formValues,
  OperationsData,
  Row,
  SelectField,
  StatusBadge,
  titleCase,
  useOperationMutation,
} from "./shared";

type View = "create" | "update";

const categories = [
  "ELECTRICAL",
  "PLUMBING",
  "CIVIL",
  "FURNITURE",
  "IT_EQUIPMENT",
  "LAB_EQUIPMENT",
  "TRANSPORT",
  "CLEANING",
  "SAFETY",
  "OTHER",
].map((value) => ({ value, label: titleCase(value) }));

const statuses = ["OPEN", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED"].map(
  (value) => ({ value, label: titleCase(value) }),
);

const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"].map((value) => ({
  value,
  label: titleCase(value),
}));

export function MaintenanceManager({ data }: { data: OperationsData }) {
  const { pending, mutate, submit } = useOperationMutation();
  const rows = useMemo(() => data.tickets ?? [], [data.tickets]);
  const [view, setView] = useState<View>("create");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [edit, setEdit] = useState<Row | null>(null);
  const open = rows.filter((row) =>
    ["OPEN", "IN_PROGRESS", "ON_HOLD"].includes(String(row.status)),
  ).length;
  const urgent = rows.filter(
    (row) =>
      row.priority === "URGENT" &&
      !["RESOLVED", "CLOSED"].includes(String(row.status)),
  ).length;
  const estimated = rows
    .filter((row) => !["RESOLVED", "CLOSED"].includes(String(row.status)))
    .reduce((sum, row) => sum + Number(row.estimatedCost ?? 0), 0);
  const resolved = rows.filter((row) =>
    ["RESOLVED", "CLOSED"].includes(String(row.status)),
  ).length;
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          `${row.ticketNo} ${row.title} ${row.description} ${row.location} ${row.assignedTo}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (statusFilter === "ALL" || row.status === statusFilter),
      ),
    [query, rows, statusFilter],
  );

  return (
    <div className="pb-10">
      <Card className="overflow-hidden rounded-[26px] border-slate-200/90 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.065)]">
        <header className="border-b border-slate-200/80 bg-gradient-to-r from-white via-white to-amber-50/35 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                {view === "create" ? (
                  <Wrench className="size-5" />
                ) : (
                  <ListChecks className="size-5" />
                )}
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-slate-950">
                  {view === "create"
                    ? "Create maintenance ticket"
                    : "Update maintenance ticket"}
                </h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  {view === "create"
                    ? "Report an issue with enough detail for assignment and cost planning."
                    : "Search tickets and update ownership, costs, progress, or resolution."}
                </p>
              </div>
            </div>

            <SegmentedSwitch
              value={view}
              onChange={setView}
              label="Maintenance ticket view"
              className="lg:w-[360px]"
              options={[
                { value: "create", label: "Create", icon: Wrench },
                { value: "update", label: "Update", icon: ListChecks },
              ]}
            />
          </div>
        </header>

        <div className="grid border-b border-slate-200/80 bg-slate-50/55 sm:grid-cols-4">
          <SummaryItem icon={Wrench} label="Open tickets" value={open} tone="amber" />
          <SummaryItem
            icon={AlertOctagon}
            label="Urgent"
            value={urgent}
            tone={urgent ? "rose" : "emerald"}
          />
          <SummaryItem
            icon={ClipboardCheck}
            label="Resolved"
            value={resolved}
            tone="emerald"
          />
          <SummaryItem
            icon={CircleDollarSign}
            label="Open estimate"
            value={formatCurrency(estimated)}
            tone="indigo"
          />
        </div>

        {view === "create" ? (
          <CardContent className="px-5 py-6 sm:px-6 sm:py-7">
            <form
              className="space-y-6"
              onSubmit={(event) =>
                submit(
                  "CREATE_MAINTENANCE",
                  event,
                  undefined,
                  "Maintenance ticket created.",
                )
              }
            >
              <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.035)] sm:p-6">
                <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xs font-black text-amber-700 ring-1 ring-amber-100">
                    1
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">
                      Issue details
                    </h3>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">
                      Describe the problem, its location, priority, and impact.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Issue title" required className="md:col-span-2 xl:col-span-3">
                    <Input
                      name="title"
                      minLength={3}
                      maxLength={180}
                      required
                      placeholder="Water leakage near primary washroom"
                    />
                  </Field>
                  <Field label="Category" required>
                    <SelectField
                      name="category"
                      placeholder="Choose category"
                      options={categories}
                    />
                  </Field>
                  <Field label="Priority" required>
                    <SelectField
                      name="priority"
                      placeholder="Choose priority"
                      defaultValue="MEDIUM"
                      options={priorities}
                    />
                  </Field>
                  <Field label="Location">
                    <Input
                      name="location"
                      maxLength={120}
                      placeholder="Block, floor and room"
                    />
                  </Field>
                  <Field
                    label="Detailed description"
                    required
                    className="md:col-span-2 xl:col-span-3"
                  >
                    <Textarea
                      name="description"
                      minLength={3}
                      maxLength={1500}
                      required
                      placeholder="Problem, impact, safety risk and any temporary action taken"
                      className="min-h-28 resize-y"
                    />
                  </Field>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.035)] sm:p-6">
                <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xs font-black text-amber-700 ring-1 ring-amber-100">
                    2
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">
                      Assignment and planning
                    </h3>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">
                      These details can be refined later from the Update view.
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Assign to">
                    <Input
                      name="assignedTo"
                      maxLength={160}
                      placeholder="Person, team or vendor"
                    />
                  </Field>
                  <Field label="Estimated cost (₹)">
                    <Input name="estimatedCost" type="number" min="0" step="0.01" />
                  </Field>
                  <Field label="Target completion">
                    <Input name="dueDate" type="date" />
                  </Field>
                </div>
              </section>

              <div className="flex justify-end">
                <Button className="w-full sm:w-auto sm:min-w-72" disabled={pending}>
                  <Wrench className="size-4" />
                  Create maintenance ticket
                </Button>
              </div>
            </form>
          </CardContent>
        ) : (
          <CardContent className="px-5 py-6 sm:px-6 sm:py-7">
            <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="h-11 rounded-2xl border-slate-200 bg-white pl-10"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search ticket, issue, location or assignee"
                />
              </div>
              <SelectField
                name="maintenanceStatusFilter"
                placeholder="Filter status"
                value={statusFilter}
                onValueChange={setStatusFilter}
                options={[{ value: "ALL", label: "All statuses" }, ...statuses]}
              />
            </div>

            <div className="mt-5">
              {!filtered.length ? (
                <EmptyPanel
                  title="No maintenance tickets"
                  description="Create the first ticket or change the filters."
                />
              ) : (
                <div className="grid gap-4 2xl:grid-cols-2">
                  {filtered.map((row) => (
                    <TicketCard
                      key={String(row.id)}
                      row={row}
                      onEdit={() => setEdit(row)}
                    />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <Dialog
        open={Boolean(edit)}
        onOpenChange={(open) => {
          if (!open) setEdit(null);
        }}
      >
        <DialogContent>
          <form
            key={String(edit?.id ?? "new")}
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              if (!edit) return;
              const values = formValues(event.currentTarget);
              mutate(
                "UPDATE_MAINTENANCE",
                { id: edit.id, ...values },
                {
                  success: "Maintenance ticket updated.",
                  after: () => setEdit(null),
                },
              );
            }}
          >
            <DialogHeader>
              <DialogTitle>Update maintenance ticket</DialogTitle>
              <DialogDescription>
                {String(edit?.ticketNo ?? "")} · {String(edit?.title ?? "")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-5 sm:grid-cols-2">
              <Field label="Status" required>
                <SelectField
                  name="status"
                  placeholder="Choose status"
                  defaultValue={String(edit?.status ?? "OPEN")}
                  options={statuses}
                />
              </Field>
              <Field label="Assigned to">
                <Input
                  name="assignedTo"
                  defaultValue={String(edit?.assignedTo ?? "")}
                />
              </Field>
              <Field label="Actual cost (₹)">
                <Input
                  name="actualCost"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={String(edit?.actualCost ?? "")}
                />
              </Field>
              <Field label="Resolution / work notes" className="sm:col-span-2">
                <Textarea
                  name="resolution"
                  defaultValue={String(edit?.resolution ?? "")}
                  placeholder="Work completed, parts replaced or reason for hold"
                />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEdit(null)}>
                Cancel
              </Button>
              <Button disabled={pending}>Save ticket update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryItem({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Wrench;
  label: string;
  value: string | number;
  tone: "amber" | "rose" | "emerald" | "indigo";
}) {
  const colors = {
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    rose: "bg-rose-50 text-rose-600 ring-rose-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  }[tone];

  return (
    <div className="flex items-center gap-3 border-b border-slate-200/70 px-5 py-3.5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:px-6">
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-xl ring-1",
          colors,
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-base font-black leading-none text-slate-950">
          {value}
        </p>
        <p className="mt-1 truncate text-xs font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function TicketCard({ row, onEdit }: { row: Row; onEdit: () => void }) {
  return (
    <article className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.045)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-500">
              {String(row.ticketNo)}
            </span>
            <StatusBadge value={row.priority} />
            <StatusBadge value={row.status} />
          </div>
          <h3 className="mt-2 font-bold text-slate-950">{String(row.title)}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
            {String(row.description)}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onEdit}>
          Update
        </Button>
      </div>
      <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:grid-cols-3">
        <span>Location: {String(row.location ?? "—")}</span>
        <span>Assigned: {String(row.assignedTo ?? "Unassigned")}</span>
        <span>Due: {formatDate(row.dueDate)}</span>
        <span>Estimate: {formatCurrency(row.estimatedCost)}</span>
        <span>Actual: {formatCurrency(row.actualCost)}</span>
        <span>Created: {formatDate(row.createdAt)}</span>
      </div>
    </article>
  );
}
