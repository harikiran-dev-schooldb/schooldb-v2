"use client";

import { useMemo, useState } from "react";
import {
  Clock3,
  DoorOpen,
  IdCard,
  ListChecks,
  LogOut,
  Search,
  ShieldCheck,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  formatDateTime,
  OperationsData,
  Row,
  SelectField,
  StatusBadge,
  titleCase,
  useOperationMutation,
} from "./shared";

type View = "create" | "update";

const idProofOptions = [
  "AADHAAR",
  "DRIVING_LICENCE",
  "VOTER_ID",
  "PASSPORT",
  "EMPLOYEE_ID",
  "OTHER",
].map((value) => ({ value, label: titleCase(value) }));

export function VisitorManager({ data }: { data: OperationsData }) {
  const { pending, mutate, submit } = useOperationMutation();
  const rows = useMemo(() => data.visitors ?? [], [data.visitors]);
  const [view, setView] = useState<View>("create");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [checkout, setCheckout] = useState<Row | null>(null);
  const active = rows.filter((row) => row.status === "CHECKED_IN").length;
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = rows.filter(
    (row) => String(row.checkInAt).slice(0, 10) === today,
  ).length;
  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const matchesQuery =
          `${row.visitorName} ${row.phone} ${row.gatePassCode} ${row.personToMeet} ${row.purpose}`
            .toLowerCase()
            .includes(query.toLowerCase());
        return matchesQuery && (status === "ALL" || row.status === status);
      }),
    [query, rows, status],
  );

  return (
    <div className="pb-10">
      <Card className="overflow-hidden rounded-[26px] border-slate-200/90 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.065)]">
        <header className="border-b border-slate-200/80 bg-gradient-to-r from-white via-white to-cyan-50/35 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                {view === "create" ? (
                  <UserRoundPlus className="size-5" />
                ) : (
                  <ListChecks className="size-5" />
                )}
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-slate-950">
                  {view === "create" ? "Visitor check-in" : "Update visitor visit"}
                </h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  {view === "create"
                    ? "Capture visitor details and issue a traceable gate pass."
                    : "Find a visit, confirm who remains on campus, and record check-out."}
                </p>
              </div>
            </div>

            <SegmentedSwitch
              value={view}
              onChange={setView}
              label="Visitor register view"
              className="lg:w-[360px]"
              options={[
                { value: "create", label: "Create", icon: UserRoundPlus },
                { value: "update", label: "Update", icon: ListChecks },
              ]}
            />
          </div>
        </header>

        <div className="grid border-b border-slate-200/80 bg-slate-50/55 sm:grid-cols-3">
          <SummaryItem
            icon={UsersRound}
            label="Currently on campus"
            value={active}
            tone="emerald"
          />
          <SummaryItem
            icon={Clock3}
            label="Visits today"
            value={todayCount}
            tone="cyan"
          />
          <SummaryItem
            icon={IdCard}
            label="Total visits"
            value={rows.length}
            tone="indigo"
          />
        </div>

        {view === "create" ? (
          <CardContent className="px-5 py-6 sm:px-6 sm:py-7">
            <form
              className="space-y-6"
              onSubmit={(event) =>
                submit(
                  "CHECK_IN_VISITOR",
                  event,
                  undefined,
                  "Visitor checked in and gate pass issued.",
                )
              }
            >
              <FormSection
                number="1"
                title="Visitor and host"
                description="Record who is entering and who they are meeting."
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Visitor full name" required>
                    <Input
                      name="visitorName"
                      minLength={2}
                      maxLength={160}
                      required
                      placeholder="Name as shown on ID"
                    />
                  </Field>
                  <Field label="Mobile number" required>
                    <Input
                      name="phone"
                      type="tel"
                      minLength={7}
                      maxLength={24}
                      required
                      placeholder="Contact number"
                    />
                  </Field>
                  <Field label="Person to meet">
                    <Input
                      name="personToMeet"
                      maxLength={160}
                      placeholder="Staff member or department"
                    />
                  </Field>
                  <Field
                    label="Purpose of visit"
                    required
                    className="md:col-span-2 xl:col-span-3"
                  >
                    <Textarea
                      name="purpose"
                      minLength={2}
                      maxLength={300}
                      required
                      placeholder="Admission enquiry, parent meeting, delivery…"
                      className="min-h-24 resize-y"
                    />
                  </Field>
                </div>
              </FormSection>

              <FormSection
                number="2"
                title="Identity and access details"
                description="Store only the minimum identity information needed at the gate."
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="ID proof type">
                    <SelectField
                      name="idProofType"
                      placeholder="Select ID proof"
                      options={idProofOptions}
                    />
                  </Field>
                  <Field
                    label="Last four ID digits"
                    hint="Only the last four digits are stored."
                  >
                    <Input
                      name="idProofLastFour"
                      inputMode="numeric"
                      minLength={4}
                      maxLength={4}
                      placeholder="1234"
                    />
                  </Field>
                  <Field label="Vehicle number">
                    <Input
                      name="vehicleNumber"
                      maxLength={30}
                      placeholder="KA 01 AB 1234"
                    />
                  </Field>
                  <Field label="Notes" className="md:col-span-2 xl:col-span-3">
                    <Input
                      name="notes"
                      maxLength={500}
                      placeholder="Items carried or special instructions"
                    />
                  </Field>
                </div>
              </FormSection>

              <div className="flex justify-end">
                <Button className="w-full sm:w-auto sm:min-w-72" disabled={pending}>
                  <ShieldCheck className="size-4" />
                  Check in and issue gate pass
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
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-11 rounded-2xl border-slate-200 bg-white pl-10"
                  placeholder="Search visitor, phone, pass, host or purpose"
                />
              </div>
              <SelectField
                name="visitorStatusFilter"
                placeholder="Filter status"
                value={status}
                onValueChange={setStatus}
                options={[
                  { value: "ALL", label: "All visits" },
                  { value: "CHECKED_IN", label: "Currently on campus" },
                  { value: "CHECKED_OUT", label: "Checked out" },
                ]}
              />
            </div>

            <div className="mt-5">
              {!filtered.length ? (
                <EmptyPanel
                  title="No matching visitors"
                  description="Change the filters or create the first visitor check-in."
                />
              ) : (
                <div className="grid gap-4 2xl:grid-cols-2">
                  {filtered.map((row) => (
                    <VisitorCard
                      key={String(row.id)}
                      row={row}
                      onCheckout={() => setCheckout(row)}
                    />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <Dialog
        open={Boolean(checkout)}
        onOpenChange={(open) => {
          if (!open) setCheckout(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check out this visitor?</DialogTitle>
            <DialogDescription>
              {String(checkout?.visitorName ?? "Visitor")} will be removed from
              the live on-campus count. The visit remains in the permanent
              register.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <DoorOpen className="size-4 text-cyan-700" />
              Gate pass {String(checkout?.gatePassCode ?? "")}
            </p>
            <p className="mt-2 text-slate-500">
              Checked in {formatDateTime(checkout?.checkInAt)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckout(null)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                checkout &&
                mutate(
                  "CHECK_OUT_VISITOR",
                  { id: checkout.id },
                  {
                    success: "Visitor checked out.",
                    after: () => setCheckout(null),
                  },
                )
              }
            >
              Confirm check-out
            </Button>
          </DialogFooter>
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
  icon: typeof UsersRound;
  label: string;
  value: number;
  tone: "emerald" | "cyan" | "indigo";
}) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    cyan: "bg-cyan-50 text-cyan-700 ring-cyan-100",
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
      <div>
        <p className="text-lg font-black leading-none text-slate-950">{value}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function FormSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.035)] sm:p-6">
      <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-xs font-black text-cyan-700 ring-1 ring-cyan-100">
          {number}
        </span>
        <div>
          <h3 className="text-sm font-bold text-slate-950">{title}</h3>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function VisitorCard({
  row,
  onCheckout,
}: {
  row: Row;
  onCheckout: () => void;
}) {
  const onCampus = row.status === "CHECKED_IN";
  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 pl-5 shadow-[0_8px_28px_rgba(15,23,42,0.045)] sm:p-5 sm:pl-6">
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          onCampus ? "bg-emerald-400" : "bg-slate-300",
        )}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
            <IdCard className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-slate-950">
              {String(row.visitorName)}
            </p>
            <p className="mt-0.5 truncate text-sm text-slate-500">
              {String(row.phone)} · {String(row.purpose)}
            </p>
          </div>
        </div>
        <StatusBadge value={row.status} />
      </div>
      <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:grid-cols-3">
        <span>
          Pass <strong className="text-slate-800">{String(row.gatePassCode)}</strong>
        </span>
        <span>In {formatDateTime(row.checkInAt)}</span>
        <span>Meeting {String(row.personToMeet ?? "—")}</span>
      </div>
      {onCampus ? (
        <Button size="sm" className="mt-4" variant="outline" onClick={onCheckout}>
          <LogOut className="size-4" />
          Check out visitor
        </Button>
      ) : (
        <Badge className="mt-4" variant="outline">
          Checked out {formatDateTime(row.checkOutAt)}
        </Badge>
      )}
    </article>
  );
}
