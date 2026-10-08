"use client";

import { useMemo, useState } from "react";
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock3,
  KeyRound,
  ListChecks,
  Phone,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserPlus,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

import { SearchableStudentSelect } from "@/components/common/select/SearchableStudentSelect";
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
  formatDate,
  formatDateTime,
  nested,
  OperationsData,
  Row,
  SelectField,
  StatusBadge,
  titleCase,
  useOperationMutation,
} from "./shared";

type View = "create" | "update";

const relationshipOptions = [
  "FATHER",
  "MOTHER",
  "GUARDIAN",
  "GRANDPARENT",
  "SIBLING",
  "RELATIVE",
  "DRIVER",
  "OTHER",
].map((value) => ({ value, label: titleCase(value) }));

export function PickupManager({ data }: { data: OperationsData }) {
  const { pending, mutate, submit } = useOperationMutation();
  const rows = useMemo(() => data.authorizations ?? [], [data.authorizations]);
  const [view, setView] = useState<View>("create");
  const [studentId, setStudentId] = useState("");
  const [query, setQuery] = useState("");
  const [verify, setVerify] = useState<Row | null>(null);
  const [revoke, setRevoke] = useState<Row | null>(null);
  const active = rows.filter((row) => row.status === "ACTIVE").length;
  const used = rows.filter((row) => row.lastUsedAt).length;
  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        `${row.pickupCode} ${nested(row, "student", "fullName")} ${row.authorizedName} ${row.phone} ${row.relationship}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query, rows],
  );
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="pb-10">
      <Card className="overflow-hidden rounded-[26px] border-slate-200/90 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.065)]">
        <header className="border-b border-slate-200/80 bg-gradient-to-r from-white via-white to-indigo-50/35 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                {view === "create" ? (
                  <UserPlus className="size-5" />
                ) : (
                  <ListChecks className="size-5" />
                )}
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-slate-950">
                  {view === "create"
                    ? "Create pickup authorization"
                    : "Update pickup authorization"}
                </h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  {view === "create"
                    ? "Issue a secure pass to an approved person for a defined period."
                    : "Find an existing pass to verify a pickup or revoke access."}
                </p>
              </div>
            </div>

            <SegmentedSwitch
              value={view}
              onChange={setView}
              label="Pickup authorization view"
              className="lg:w-[360px]"
              options={[
                { value: "create", label: "Create", icon: UserPlus },
                { value: "update", label: "Update", icon: RefreshCcw },
              ]}
            />
          </div>
        </header>

        <div className="grid border-b border-slate-200/80 bg-slate-50/55 sm:grid-cols-3">
          <SummaryItem
            icon={ShieldCheck}
            label="Active passes"
            value={active}
            tone="emerald"
          />
          <SummaryItem
            icon={CheckCircle2}
            label="Pickups recorded"
            value={used}
            tone="indigo"
          />
          <SummaryItem
            icon={UsersRound}
            label="Total authorizations"
            value={rows.length}
            tone="violet"
          />
        </div>

        {view === "create" ? (
          <CardContent className="px-5 py-6 sm:px-6 sm:py-7">
            <form
              onSubmit={(event) =>
                submit(
                  "AUTHORIZE_PICKUP",
                  event,
                  { studentId },
                  "Pickup authorization created.",
                )
              }
            >
              <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
                <div className="space-y-6">
                  <FormPanel
                    number="1"
                    title="Choose the student"
                    description="Filter the current student list, then select one student."
                  >
                    <Field label="Student" required>
                      <SearchableStudentSelect
                        value={studentId}
                        onChange={setStudentId}
                        academicYearId={data.academicYearId ?? undefined}
                      />
                    </Field>
                  </FormPanel>

                  <FormPanel
                    number="2"
                    title="Authorized person"
                    description="Use the same details shown on the person's identity document."
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Full name"
                        required
                        className="sm:col-span-2"
                      >
                        <Input
                          name="authorizedName"
                          minLength={2}
                          maxLength={160}
                          required
                          placeholder="Name as shown on ID"
                        />
                      </Field>
                      <Field label="Relationship" required>
                        <SelectField
                          name="relationship"
                          placeholder="Choose relationship"
                          options={relationshipOptions}
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
                    </div>
                  </FormPanel>
                </div>

                <FormPanel
                  number="3"
                  title="Validity and approval"
                  description="Control when and how often this pass may be used."
                  className="xl:sticky xl:top-6"
                >
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      <Field label="Valid from" required>
                        <Input
                          name="validFrom"
                          type="date"
                          defaultValue={today}
                          required
                        />
                      </Field>
                      <Field label="Valid until">
                        <Input name="validUntil" type="date" />
                      </Field>
                    </div>

                    <label className="group flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/40 has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50/70">
                      <input
                        type="checkbox"
                        name="recurring"
                        className="mt-0.5 size-4 accent-indigo-600"
                      />
                      <span className="flex min-w-0 flex-1 gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 transition group-has-[:checked]:text-indigo-600 group-has-[:checked]:ring-indigo-200">
                          <RefreshCcw className="size-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-slate-900">
                            Recurring authorization
                          </span>
                          <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                            Permit repeated pickups during the validity period.
                          </span>
                        </span>
                      </span>
                    </label>

                    <Field label="Approval notes">
                      <Textarea
                        name="notes"
                        maxLength={500}
                        placeholder="ID verified by, restrictions or dismissal instructions"
                        className="min-h-28 resize-y"
                      />
                    </Field>

                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/55 p-4">
                      <div className="flex gap-3">
                        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-indigo-600" />
                        <p className="text-xs leading-5 text-slate-600">
                          A unique pickup code will be generated. Verify the code
                          and the person&apos;s ID before releasing the student.
                        </p>
                      </div>
                    </div>

                    <Button
                      size="lg"
                      className="w-full rounded-xl"
                      disabled={pending || !studentId}
                    >
                      <KeyRound className="size-4" />
                      Issue pickup authorization
                    </Button>
                  </div>
                </FormPanel>
              </div>
            </form>
          </CardContent>
        ) : (
          <CardContent className="px-5 py-6 sm:px-6 sm:py-7">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/45 p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100">
                  <ListChecks className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Authorization register
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">
                    Search active and historical pickup passes.
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="mt-3 border-indigo-100 bg-white px-3 py-1.5 text-indigo-700 shadow-sm sm:mt-0"
              >
                {filtered.length} {filtered.length === 1 ? "record" : "records"}
              </Badge>
            </div>

            <div className="relative mt-5">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-11 rounded-2xl border-slate-200 bg-white pl-10 pr-4 shadow-sm focus-visible:ring-indigo-500/15"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by student, person, phone or pickup code"
              />
            </div>

            {!filtered.length ? (
              <div className="mt-5">
                <EmptyPanel
                  title="No pickup authorizations"
                  description="Create the first authorization or change the search."
                />
              </div>
            ) : (
              <div className="mt-5 grid gap-4 2xl:grid-cols-2">
                {filtered.map((row) => (
                  <AuthorizationCard
                    key={String(row.id)}
                    row={row}
                    onVerify={() => setVerify(row)}
                    onRevoke={() => setRevoke(row)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <VerifyDialog
        row={verify}
        pending={pending}
        onClose={() => setVerify(null)}
        onConfirm={() =>
          verify &&
          mutate(
            "UPDATE_PICKUP",
            { id: verify.id, action: "USE" },
            {
              success: "Student pickup recorded.",
              after: () => setVerify(null),
            },
          )
        }
      />

      <Dialog
        open={Boolean(revoke)}
        onOpenChange={(open) => {
          if (!open) setRevoke(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke this authorization?</DialogTitle>
            <DialogDescription>
              The pickup code for{" "}
              {revoke
                ? nested(revoke, "student", "fullName")
                : "this student"}{" "}
              will stop working immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevoke(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                revoke &&
                mutate(
                  "UPDATE_PICKUP",
                  { id: revoke.id, action: "REVOKE" },
                  {
                    success: "Pickup authorization revoked.",
                    after: () => setRevoke(null),
                  },
                )
              }
            >
              Revoke authorization
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
  icon: typeof ShieldCheck;
  label: string;
  value: number;
  tone: "emerald" | "indigo" | "violet";
}) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100",
    violet: "bg-violet-50 text-violet-600 ring-violet-100",
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

function FormPanel({
  number,
  title,
  description,
  children,
  className,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.035)] sm:p-6",
        className,
      )}
    >
      <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-black text-indigo-600 ring-1 ring-indigo-100">
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

function AuthorizationCard({
  row,
  onVerify,
  onRevoke,
}: {
  row: Row;
  onVerify: () => void;
  onRevoke: () => void;
}) {
  const isActive = row.status === "ACTIVE";

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.045)] transition hover:border-indigo-200 hover:shadow-[0_14px_35px_rgba(79,70,229,0.08)]">
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          isActive ? "bg-emerald-400" : "bg-slate-300",
        )}
      />
      <div className="p-4 pl-5 sm:p-5 sm:pl-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 text-indigo-600 ring-1 ring-indigo-100">
              <UserRoundCheck className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-950">
                {nested(row, "student", "fullName")}
              </p>
              <p className="mt-0.5 truncate text-sm text-slate-500">
                Authorized person:{" "}
                <span className="font-semibold text-slate-700">
                  {String(row.authorizedName)}
                </span>
              </p>
            </div>
          </div>
          <StatusBadge value={row.status} />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <PassDetail
            icon={KeyRound}
            label="Pickup code"
            value={String(row.pickupCode)}
            mono
          />
          <PassDetail
            icon={CalendarDays}
            label="Validity"
            value={`${formatDate(row.validFrom)} – ${formatDate(row.validUntil)}`}
          />
          <PassDetail
            icon={row.recurring ? RefreshCcw : Clock3}
            label="Pass type"
            value={row.recurring ? "Recurring" : "One-time / controlled"}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <UsersRound className="size-3.5" />
            {titleCase(row.relationship)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Phone className="size-3.5" />
            {String(row.phone)}
          </span>
          {row.lastUsedAt ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="size-3.5" />
              Last used {formatDateTime(row.lastUsedAt)}
            </span>
          ) : null}
        </div>

        {isActive ? (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <Button size="sm" onClick={onVerify}>
              <CheckCircle2 className="size-4" />
              Verify & record pickup
            </Button>
            <Button size="sm" variant="outline" onClick={onRevoke}>
              <Ban className="size-4" />
              Revoke
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function PassDetail({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: typeof KeyRound;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        <Icon className="size-3" />
        {label}
      </div>
      <p
        className={cn(
          "mt-1 truncate text-xs font-semibold text-slate-700",
          mono && "font-mono tracking-wide",
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function VerifyDialog({
  row,
  pending,
  onClose,
  onConfirm,
}: {
  row: Row | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={Boolean(row)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify pickup authorization</DialogTitle>
          <DialogDescription>
            Match the code and authorized person&apos;s ID before releasing the
            student.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50/55">
          <div className="border-b border-indigo-100 px-4 py-5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500">
              Pickup code
            </p>
            <p className="mt-2 font-mono text-2xl font-black tracking-widest text-slate-950">
              {String(row?.pickupCode ?? "")}
            </p>
          </div>
          <div className="space-y-2 bg-white/70 p-4 text-sm">
            <p>
              <strong>Student:</strong>{" "}
              {row ? nested(row, "student", "fullName") : ""}
            </p>
            <p>
              <strong>Pickup person:</strong> {String(row?.authorizedName ?? "")}
              {" · "}
              {String(row?.phone ?? "")}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={pending} onClick={onConfirm}>
            <CheckCircle2 className="size-4" />
            Confirm handover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
