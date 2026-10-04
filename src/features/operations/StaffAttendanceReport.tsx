"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, Loader2, Search, UserCheck, UserRoundX } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyPanel, formatDate, MetricCard, nested, Row, StatusBadge } from "./shared";

type ReportPayload = {
  from: string;
  to: string;
  attendance: Row[];
};

function schoolDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function daysInclusive(from: string, to: string) {
  return Math.max(0, Math.floor((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000) + 1);
}

async function requestReport(from: string, to: string) {
  const query = new URLSearchParams({ kind: "staff-attendance-report", from, to });
  const response = await fetch(`/api/v1/operations?${query.toString()}`);
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || "Unable to load the attendance report.");
  return result.data as ReportPayload;
}

export function StaffAttendanceReport() {
  const today = useMemo(() => schoolDateKey(), []);
  const initialFrom = `${today.slice(0, 8)}01`;
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(today);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    void requestReport(initialFrom, today)
      .then((result) => {
        if (active) setReport(result);
      })
      .catch((error) => {
        if (active) toast.error(error instanceof Error ? error.message : "Unable to load the attendance report.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialFrom, today]);

  async function load(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      setReport(await requestReport(from, to));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load the attendance report.");
    } finally {
      setLoading(false);
    }
  }

  const rows = useMemo(() => report?.attendance ?? [], [report]);
  const recordedDates = new Set(rows.map((row) => String(row.date).slice(0, 10)));
  const rangeDays = report ? daysInclusive(report.from, report.to) : 0;
  const noRegisterDays = Math.max(0, rangeDays - recordedDates.size);
  const summary = {
    present: rows.filter((row) => row.status === "PRESENT").length,
    absent: rows.filter((row) => row.status === "ABSENT").length,
    halfDay: rows.filter((row) => row.status === "HALF_DAY").length,
    onLeave: rows.filter((row) => row.status === "ON_LEAVE").length,
  };
  const staff = useMemo(() => {
    const grouped = new Map<string, { id: string; name: string; employeeId: string; designation: string; present: number; absent: number; halfDay: number; onLeave: number }>();
    for (const row of rows) {
      const id = String(row.teacherId);
      const current = grouped.get(id) ?? {
        id,
        name: nested(row, "teacher", "fullName"),
        employeeId: nested(row, "teacher", "employeeId"),
        designation: nested(row, "teacher", "designation"),
        present: 0,
        absent: 0,
        halfDay: 0,
        onLeave: 0,
      };
      if (row.status === "PRESENT") current.present += 1;
      if (row.status === "ABSENT") current.absent += 1;
      if (row.status === "HALF_DAY") current.halfDay += 1;
      if (row.status === "ON_LEAVE") current.onLeave += 1;
      grouped.set(id, current);
    }
    const needle = query.trim().toLowerCase();
    return [...grouped.values()]
      .filter((item) => !needle || `${item.name} ${item.employeeId} ${item.designation}`.toLowerCase().includes(needle))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [query, rows]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Staff attendance report</CardTitle>
          <CardDescription>
            Choose up to 93 days. A date with no attendance register is shown as no register / holiday; it does not create individual holiday records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={load}>
            <div className="space-y-2">
              <label htmlFor="staff-report-from" className="text-sm font-medium">From date</label>
              <Input id="staff-report-from" type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <label htmlFor="staff-report-to" className="text-sm font-medium">To date</label>
              <Input id="staff-report-to" type="date" value={to} min={from} max={today} onChange={(event) => setTo(event.target.value)} required />
            </div>
            <Button disabled={loading}>{loading ? <Loader2 className="size-4 animate-spin" /> : <CalendarDays className="size-4" />}View report</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Days recorded" value={recordedDates.size} detail={`${rangeDays} calendar days selected`} icon={CalendarDays} tone="emerald" />
        <MetricCard label="No register / holiday" value={noRegisterDays} detail="No staff attendance saved" icon={Clock3} tone="amber" />
        <MetricCard label="Present marks" value={summary.present} icon={UserCheck} tone="emerald" />
        <MetricCard label="Absent marks" value={summary.absent} detail={`${summary.halfDay} half day · ${summary.onLeave} on leave`} icon={UserRoundX} tone="rose" />
      </div>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Staff summary</CardTitle>
            <CardDescription>Present, absent, half-day and leave totals for each staff member.</CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search staff" aria-label="Search staff attendance report" />
          </div>
        </CardHeader>
        <CardContent>
          {loading && !report ? (
            <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />Loading report…</div>
          ) : !staff.length ? (
            <EmptyPanel title="No staff attendance in this range" description="Dates without a register are treated as no register / holiday." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {staff.map((item) => (
                <div key={item.id} className="rounded-2xl border p-4">
                  <p className="font-semibold">{item.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.employeeId}{item.designation !== "—" ? ` · ${item.designation}` : ""}</p>
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    <ReportCount label="Present" value={item.present} tone="emerald" />
                    <ReportCount label="Absent" value={item.absent} tone="rose" />
                    <ReportCount label="Half" value={item.halfDay} tone="amber" />
                    <ReportCount label="Leave" value={item.onLeave} tone="indigo" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Daily records</CardTitle><CardDescription>The individual marks behind the summary.</CardDescription></CardHeader>
        <CardContent className="p-0">
          {!rows.length ? null : <>
            <div className="grid gap-2 p-4 md:hidden">
              {rows.map((row) => <div key={String(row.id)} className="flex items-center justify-between gap-3 rounded-xl border p-3"><div><p className="text-sm font-semibold">{nested(row, "teacher", "fullName")}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(row.date)} · {nested(row, "teacher", "employeeId")}</p></div><StatusBadge value={row.status} /></div>)}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[680px] text-sm"><thead className="border-y bg-muted/30"><tr>{["Date", "Staff", "Employee ID", "Status", "Source"].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs uppercase tracking-wide text-muted-foreground">{heading}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={String(row.id)} className="border-b last:border-0"><td className="px-4 py-4">{formatDate(row.date)}</td><td className="px-4 py-4 font-semibold">{nested(row, "teacher", "fullName")}</td><td className="px-4 py-4 text-muted-foreground">{nested(row, "teacher", "employeeId")}</td><td className="px-4 py-4"><StatusBadge value={row.status} /></td><td className="px-4 py-4">{String(row.source).replaceAll("_", " ").toLowerCase()}</td></tr>)}</tbody></table>
            </div>
          </>}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportCount({ label, value, tone }: { label: string; value: number; tone: "emerald" | "rose" | "amber" | "indigo" }) {
  const styles = { emerald: "bg-emerald-50 text-emerald-700", rose: "bg-rose-50 text-rose-700", amber: "bg-amber-50 text-amber-700", indigo: "bg-indigo-50 text-indigo-700" };
  return <div className={`rounded-lg px-1 py-2 ${styles[tone]}`}><p className="font-bold">{value}</p><p className="text-[10px]">{label}</p></div>;
}
