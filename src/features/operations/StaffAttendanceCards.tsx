"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  UserCheck,
  UserRoundX,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyPanel, formatDate, OperationsData, Row, useOperationMutation } from "./shared";

type StaffStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE" | "HOLIDAY";

const statusOptions: Array<{ value: StaffStatus; label: string; short: string }> = [
  { value: "PRESENT", label: "Present", short: "Present" },
  { value: "ABSENT", label: "Absent", short: "Absent" },
  { value: "HALF_DAY", label: "Half day", short: "Half day" },
  { value: "ON_LEAVE", label: "On leave", short: "Leave" },
  { value: "HOLIDAY", label: "Holiday", short: "Holiday" },
];

function schoolDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function statusMap(rows: Row[]) {
  return new Map(
    rows.flatMap((row) => {
      const teacherId = String(row.teacherId ?? "");
      const status = String(row.status ?? "") as StaffStatus;
      return teacherId && statusOptions.some((option) => option.value === status)
        ? [[teacherId, status] as const]
        : [];
    }),
  );
}

export function StaffAttendanceCards({ data }: { data: OperationsData }) {
  const { pending, mutate } = useOperationMutation();
  const teachers = data.teachers ?? [];
  const today = useMemo(() => schoolDateKey(), []);
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState<Row[]>(data.attendance ?? []);
  const [statuses, setStatuses] = useState<Map<string, StaffStatus>>(() => statusMap(data.attendance ?? []));
  const [loadingDate, setLoadingDate] = useState(false);

  async function changeDate(nextDate: string) {
    setDate(nextDate);
    if (nextDate === today) {
      const nextRows = data.attendance ?? [];
      setRows(nextRows);
      setStatuses(statusMap(nextRows));
      return;
    }

    setLoadingDate(true);
    try {
      const response = await fetch(`/api/v1/operations?kind=staff-attendance&date=${encodeURIComponent(nextDate)}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to load attendance.");
      const nextRows = (result.data as { attendance: Row[] }).attendance ?? [];
      setRows(nextRows);
      setStatuses(statusMap(nextRows));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load attendance.");
    } finally {
      setLoadingDate(false);
    }
  }

  const summary = useMemo(() => {
    const values = [...statuses.values()];
    return {
      present: values.filter((status) => status === "PRESENT").length,
      absent: values.filter((status) => status === "ABSENT").length,
      other: values.filter((status) => ["HALF_DAY", "ON_LEAVE", "HOLIDAY"].includes(status)).length,
      unmarked: Math.max(0, teachers.length - values.length),
    };
  }, [statuses, teachers.length]);

  const allMarked = teachers.length > 0 && summary.unmarked === 0;
  const hasChanges = teachers.some((teacher) => statuses.has(teacher.id));

  function markAllPresent() {
    setStatuses(new Map(teachers.map((teacher) => [teacher.id, "PRESENT" as StaffStatus])));
  }

  function setStatus(teacherId: string, status: StaffStatus) {
    setStatuses((previous) => {
      const next = new Map(previous);
      next.set(teacherId, status);
      return next;
    });
  }

  function save() {
    if (!allMarked) {
      toast.error("Mark every staff member before saving. Start with ‘Mark everyone present’.");
      return;
    }
    mutate(
      "SAVE_STAFF_ATTENDANCE",
      { date, records: teachers.map((teacher) => ({ teacherId: teacher.id, status: statuses.get(teacher.id) })) },
      {
        success: "Staff attendance saved.",
        after: () => setRows(teachers.map((teacher) => ({ teacherId: teacher.id, status: statuses.get(teacher.id), date }))),
      },
    );
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-primary/15 shadow-sm">
        <div className="h-1 bg-primary" />
        <CardHeader className="gap-4 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Users className="size-5" />
              <span className="text-xs font-bold uppercase tracking-[0.16em]">Daily staff attendance</span>
            </div>
            <CardTitle className="mt-2 text-xl">Mark everyone present first</CardTitle>
            <CardDescription className="mt-1 max-w-2xl leading-6">
              Start the register with one tap, then change only the people who are absent, on leave or working a half day.
            </CardDescription>
          </div>
          <div className="w-full sm:w-44">
            <label htmlFor="staff-attendance-date" className="text-xs font-semibold text-muted-foreground">Attendance date</label>
            <Input id="staff-attendance-date" className="mt-2" type="date" value={date} onChange={(event) => void changeDate(event.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Summary label="Staff" value={teachers.length} icon={<Users className="size-4" />} />
            <Summary label="Present" value={summary.present} tone="emerald" icon={<UserCheck className="size-4" />} />
            <Summary label="Absent" value={summary.absent} tone="rose" icon={<UserRoundX className="size-4" />} />
            <Summary label="Needs a status" value={summary.unmarked} tone="amber" icon={<Clock3 className="size-4" />} />
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-primary/10 p-2 text-primary"><CheckCircle2 className="size-4" /></div>
              <div>
                <p className="text-sm font-semibold">{allMarked ? "Ready to save" : `${summary.unmarked} staff member${summary.unmarked === 1 ? "" : "s"} still need a status`}</p>
                <p className="mt-1 text-xs text-muted-foreground">Saving an absence creates a school-app alert. WhatsApp is sent only when your school has configured the staff template.</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={markAllPresent} disabled={loadingDate || pending || !teachers.length}>
                <UserCheck className="size-4" /> Mark everyone present
              </Button>
              <Button type="button" onClick={save} disabled={loadingDate || pending || !allMarked || !hasChanges}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Save attendance
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loadingDate ? (
        <div className="flex items-center justify-center rounded-2xl border border-dashed p-10 text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />Loading this date…</div>
      ) : !teachers.length ? (
        <EmptyPanel title="No active staff" description="Add an active staff member before opening the attendance register." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {teachers.map((teacher) => {
            const status = statuses.get(teacher.id);
            return (
              <Card key={teacher.id} className="overflow-hidden shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{teacher.fullName}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{teacher.employeeId}{teacher.designation ? ` · ${teacher.designation}` : ""}</p>
                    </div>
                    {status ? <Badge variant={status === "PRESENT" ? "success" : status === "ABSENT" ? "destructive" : "warning"}>{status.replaceAll("_", " ")}</Badge> : <Badge variant="outline">Not marked</Badge>}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {statusOptions.map((option) => (
                      <Button key={option.value} type="button" size="sm" variant={status === option.value ? option.value === "ABSENT" ? "destructive" : "default" : "outline"} aria-pressed={status === option.value} onClick={() => setStatus(teacher.id, option.value)} className="justify-center">
                        {option.short}
                      </Button>
                    ))}
                  </div>
                  {status === "ABSENT" ? <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-rose-700"><BellRing className="mt-0.5 size-3.5 shrink-0" />A school-app alert will be created when this absence is saved.</p> : null}
                  {!status ? <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-amber-700"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />Choose a status, or use the button above to start everyone as present.</p> : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {rows.length > 0 ? <p className="text-xs text-muted-foreground">Last saved entries for {formatDate(`${date}T00:00:00.000Z`)} are loaded above. Changing an absence back to present does not send a new notification.</p> : null}
    </div>
  );
}

function Summary({ label, value, icon, tone = "slate" }: { label: string; value: number; icon: React.ReactNode; tone?: "slate" | "emerald" | "rose" | "amber" }) {
  const styles = { slate: "bg-muted text-muted-foreground", emerald: "bg-emerald-50 text-emerald-700", rose: "bg-rose-50 text-rose-700", amber: "bg-amber-50 text-amber-700" };
  return <div className="flex items-center gap-3 rounded-xl border bg-card p-3"><span className={`rounded-lg p-2 ${styles[tone]}`}>{icon}</span><div><p className="text-lg font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></div>;
}
