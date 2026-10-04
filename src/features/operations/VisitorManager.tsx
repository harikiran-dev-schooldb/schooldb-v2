"use client";

import { useMemo, useState } from "react";
import {
  Clock3,
  DoorOpen,
  IdCard,
  LogOut,
  Search,
  ShieldCheck,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  EmptyPanel,
  Field,
  formatDateTime,
  MetricCard,
  OperationsData,
  Row,
  SelectField,
  StatusBadge,
  titleCase,
  useOperationMutation,
} from "./shared";

export function VisitorManager({ data }: { data: OperationsData }) {
  const { pending, mutate, submit } = useOperationMutation();
  const rows = useMemo(() => data.visitors ?? [], [data.visitors]);
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
    <div className="space-y-6 pb-10">
      <section className="rounded-3xl border border-cyan-100 bg-gradient-to-br from-white via-cyan-50/60 to-sky-50/70 p-6 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">
              Campus access desk
            </p>
            <h2 className="mt-3 text-2xl font-bold">
              Know who is on campus and why.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Capture identity details, meeting purpose, vehicle information and
              precise check-in/check-out times with an automatically generated
              gate pass.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="On campus"
              value={active}
              icon={UsersRound}
              tone="emerald"
            />
            <MetricCard label="Visits today" value={todayCount} icon={Clock3} />
          </div>
        </div>
      </section>
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRoundPlus className="size-5 text-primary" />
              Visitor check-in
            </CardTitle>
            <CardDescription>
              Fields marked with an asterisk are required before issuing a pass.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) =>
                submit(
                  "CHECK_IN_VISITOR",
                  event,
                  undefined,
                  "Visitor checked in and gate pass issued.",
                )
              }
            >
              <Field
                label="Visitor full name"
                required
                className="sm:col-span-2"
              >
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
                className="sm:col-span-2"
              >
                <Textarea
                  name="purpose"
                  minLength={2}
                  maxLength={300}
                  required
                  placeholder="Admission enquiry, parent meeting, delivery…"
                />
              </Field>
              <Field label="ID proof type">
                <SelectField
                  name="idProofType"
                  placeholder="Select ID proof"
                  options={[
                    "AADHAAR",
                    "DRIVING_LICENCE",
                    "VOTER_ID",
                    "PASSPORT",
                    "EMPLOYEE_ID",
                    "OTHER",
                  ].map((value) => ({ value, label: titleCase(value) }))}
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
              <Field label="Notes">
                <Input
                  name="notes"
                  maxLength={500}
                  placeholder="Items carried or special instructions"
                />
              </Field>
              <div className="sm:col-span-2">
                <Button className="w-full" disabled={pending}>
                  <ShieldCheck className="size-4" />
                  Check in and issue gate pass
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Visitor register</CardTitle>
            <CardDescription>
              Search by visitor, phone, pass code, host or purpose.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-9"
                  placeholder="Search visitor register"
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
            {!filtered.length ? (
              <EmptyPanel
                title="No matching visitors"
                description="Change the filters or check in the first visitor."
              />
            ) : (
              <div className="space-y-3">
                {filtered.map((row) => (
                  <div key={String(row.id)} className="rounded-2xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                          <IdCard className="size-5" />
                        </div>
                        <div>
                          <p className="font-bold">{String(row.visitorName)}</p>
                          <p className="text-sm text-muted-foreground">
                            {String(row.phone)} · {String(row.purpose)}
                          </p>
                        </div>
                      </div>
                      <StatusBadge value={row.status} />
                    </div>
                    <div className="mt-4 grid gap-2 border-t pt-4 text-xs text-muted-foreground sm:grid-cols-3">
                      <span>
                        Pass{" "}
                        <strong className="text-foreground">
                          {String(row.gatePassCode)}
                        </strong>
                      </span>
                      <span>In {formatDateTime(row.checkInAt)}</span>
                      <span>Meeting {String(row.personToMeet ?? "—")}</span>
                    </div>
                    {row.status === "CHECKED_IN" ? (
                      <Button
                        size="sm"
                        className="mt-4"
                        variant="outline"
                        onClick={() => setCheckout(row)}
                      >
                        <LogOut className="size-4" />
                        Check out visitor
                      </Button>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Checked out {formatDateTime(row.checkOutAt)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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
          <div className="rounded-2xl border bg-muted/25 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <DoorOpen className="size-4" />
              Gate pass {String(checkout?.gatePassCode ?? "")}
            </p>
            <p className="mt-2 text-muted-foreground">
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
