"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  CheckCheck,
  LockKeyhole,
  ShieldCheck,
  UserCheck,
  UserRoundX,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  operationRequest,
  type Row,
  type TeacherOption,
} from "./shared";

function indiaDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

export function StaffAttendanceMarker({
  teachers,
  attendance,
}: {
  teachers: TeacherOption[];
  attendance: Row[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const today = useMemo(() => indiaDateKey(), []);

  const todayRows = useMemo(
    () =>
      attendance.filter(
        (row) => String(row.date ?? "").slice(0, 10) === today,
      ),
    [attendance, today],
  );

  const initialAbsent = useMemo(
    () =>
      new Set(
        todayRows
          .filter((row) => row.status === "ABSENT")
          .map((row) => String(row.teacherId)),
      ),
    [todayRows],
  );

  const initialStarted = teachers.length > 0 && todayRows.length >= teachers.length;
  const [started, setStarted] = useState(initialStarted);
  const [locked, setLocked] = useState(
    todayRows.some((row) => Boolean(row.lockedAt)),
  );
  const [absentIds, setAbsentIds] = useState<Set<string>>(initialAbsent);

  useEffect(() => {
    setStarted(teachers.length > 0 && todayRows.length >= teachers.length);
    setLocked(todayRows.some((row) => Boolean(row.lockedAt)));
    setAbsentIds(initialAbsent);
  }, [teachers.length, todayRows, initialAbsent]);

  const present = started ? Math.max(teachers.length - absentIds.size, 0) : 0;

  function markFullPresent() {
    startTransition(async () => {
      try {
        await operationRequest("FULL_PRESENT_STAFF_ATTENDANCE", { date: today });
        setStarted(true);
        setLocked(false);
        setAbsentIds(new Set());
        toast.success(
          `All ${teachers.length} staff marked present. Tap only the absentees now.`,
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to mark full present.",
        );
      }
    });
  }

  function toggleAbsent(teacherId: string) {
    if (!started || locked || pending) return;
    setAbsentIds((current) => {
      const next = new Set(current);
      if (next.has(teacherId)) next.delete(teacherId);
      else next.add(teacherId);
      return next;
    });
  }

  function saveAndLock() {
    startTransition(async () => {
      try {
        const result = (await operationRequest("FINALIZE_STAFF_ATTENDANCE", {
          date: today,
          absentTeacherIds: [...absentIds],
        })) as {
          present?: number;
          absent?: number;
        };
        setLocked(true);
        toast.success(
          `Attendance locked: ${result.present ?? present} present, ${result.absent ?? absentIds.size} absent. Absence notifications processed.`,
        );
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to lock attendance.",
        );
      }
    });
  }

  return (
    <Card className="overflow-hidden border-indigo-100 shadow-sm">
      <CardHeader className="border-b bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">
                Today&apos;s staff attendance
              </CardTitle>
              {locked ? (
                <Badge variant="success" className="gap-1">
                  <LockKeyhole className="size-3" />
                  Locked
                </Badge>
              ) : started ? (
                <Badge variant="info">Marking</Badge>
              ) : (
                <Badge variant="secondary">Not started</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              First mark everyone present, then tap only the staff who are absent.
              WhatsApp and app alerts are sent only after Save &amp; Lock.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={started ? "outline" : "default"}
              disabled={pending || locked || teachers.length === 0}
              onClick={markFullPresent}
            >
              <CheckCheck className="size-4" />
              Mark Full Present
            </Button>
            <Button
              type="button"
              disabled={pending || locked || !started}
              onClick={saveAndLock}
            >
              <LockKeyhole className="size-4" />
              Save &amp; Lock
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <UsersRound className="size-4" />
              Total
            </div>
            <p className="mt-2 text-2xl font-black">{teachers.length}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              <UserCheck className="size-4" />
              Present
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-800">
              {present}
            </p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-700">
              <UserRoundX className="size-4" />
              Absent
            </div>
            <p className="mt-2 text-2xl font-black text-rose-800">
              {absentIds.size}
            </p>
          </div>
        </div>

        {!started ? (
          <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/15 px-6 text-center">
            <ShieldCheck className="size-8 text-indigo-600" />
            <p className="mt-3 font-semibold">Start with Full Present</p>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              This initializes today&apos;s attendance as present for every active
              staff member. You can then tap the absent staff cards before locking.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {teachers.map((teacher) => {
              const absent = absentIds.has(teacher.id);
              return (
                <button
                  key={teacher.id}
                  type="button"
                  disabled={locked || pending}
                  onClick={() => toggleAbsent(teacher.id)}
                  className={cn(
                    "aspect-square rounded-2xl border-2 p-3 text-left transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    locked || pending
                      ? "cursor-default"
                      : "hover:-translate-y-0.5 hover:shadow-md",
                    absent
                      ? "border-rose-300 bg-rose-50 text-rose-950"
                      : "border-emerald-200 bg-emerald-50/70 text-emerald-950",
                  )}
                >
                  <div className="flex h-full flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xl",
                          absent
                            ? "bg-rose-100 text-rose-700"
                            : "bg-emerald-100 text-emerald-700",
                        )}
                      >
                        {absent ? (
                          <UserRoundX className="size-5" />
                        ) : (
                          <UserCheck className="size-5" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
                          absent
                            ? "bg-rose-100 text-rose-700"
                            : "bg-emerald-100 text-emerald-700",
                        )}
                      >
                        {absent ? "Absent" : "Present"}
                      </span>
                    </div>
                    <div>
                      <p className="line-clamp-2 text-sm font-bold leading-5">
                        {teacher.fullName}
                      </p>
                      <p className="mt-1 truncate text-xs opacity-70">
                        {teacher.employeeId}
                        {teacher.designation
                          ? ` · ${teacher.designation}`
                          : ""}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {locked ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800">
            <ShieldCheck className="size-4" />
            Attendance is finalized. Absent staff were notified through the app
            and WhatsApp when a valid linked account/phone was available.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
