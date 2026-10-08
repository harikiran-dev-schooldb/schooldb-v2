"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AcademicYearSelect,
  ClassSelect,
  SectionSelect,
} from "@/components/common/select";

import {
  BookOpenCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  Loader2,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { refreshTable } from "@/lib/table-event";
import { BulkAbsenteeMarker } from "./BulkAbsenteeMarker";

type AttendanceMode = "ONCE_DAILY" | "MORNING_AFTERNOON" | "EVERY_PERIOD";

type AcademicYearOption = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  attendanceMode: AttendanceMode;
  active?: boolean;
};

/* ==========================================================================
   HELPERS
   ========================================================================== */

function schoolDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function dateKey(value: string) {
  return value.slice(0, 10);
}

function clampAttendanceDate(
  value: string,
  year: Pick<AcademicYearOption, "startDate" | "endDate">,
  today: string,
) {
  const minimum = dateKey(year.startDate);
  const maximum = [dateKey(year.endDate), today].sort()[0];

  if (value < minimum || value > maximum) return maximum;
  return value;
}

function getModeLabel(mode: AttendanceMode) {
  switch (mode) {
    case "ONCE_DAILY":
      return "Once Daily";

    case "MORNING_AFTERNOON":
      return "Morning & Afternoon";

    case "EVERY_PERIOD":
      return "Every Period";
  }
}

/* ==========================================================================
   PAGE
   ========================================================================== */

export function AttendancePage() {
  const today = schoolDateKey();

  const [attendanceDate, setAttendanceDate] = useState(today);

  const [academicYearId, setAcademicYearId] = useState("");

  const [classId, setClassId] = useState("");

  const [sectionId, setSectionId] = useState("");

  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);

  const [loading, setLoading] = useState(false);

  const [presentScope, setPresentScope] = useState<
    "SCHOOL" | "CLASS" | "SECTION"
  >("SECTION");

  /* ==========================================================================
     LOAD ACADEMIC YEARS
     ========================================================================== */

  useEffect(() => {
    const controller = new AbortController();

    const loadAcademicYears = async () => {
      try {
        const response = await fetch("/api/v1/academic-years/options", {
          signal: controller.signal,
        });

        const result = await response.json();

        if (controller.signal.aborted) {
          return;
        }

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        const options = (result.data ?? []) as AcademicYearOption[];

        setAcademicYears(options);

        const activeYear = options.find((year) => year.active);

        if (activeYear) {
          setAcademicYearId(activeYear.id);
          setAttendanceDate((current) =>
            clampAttendanceDate(current, activeYear, schoolDateKey()),
          );
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        toast.error("Failed to load academic years.");
      }
    };

    void loadAcademicYears();

    return () => {
      controller.abort();
    };
  }, []);

  /* ==========================================================================
     SELECTED ACADEMIC YEAR
     ========================================================================== */

  const selectedAcademicYear = academicYears.find(
    (year) => year.id === academicYearId,
  );

  const attendanceMode = selectedAcademicYear?.attendanceMode ?? "ONCE_DAILY";

  const minimumDate = selectedAcademicYear
    ? dateKey(selectedAcademicYear.startDate)
    : undefined;

  const maximumDate = selectedAcademicYear
    ? [dateKey(selectedAcademicYear.endDate), today].sort()[0]
    : today;

  const selectedDateLabel = new Date(
    `${attendanceDate}T00:00:00`,
  ).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const selectedDate = new Date(`${attendanceDate}T00:00:00`);
  const selectedWeekday = selectedDate.toLocaleDateString("en-IN", {
    weekday: "long",
  });
  const selectedDay = selectedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
  });
  const selectedMonthYear = selectedDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const isToday = attendanceDate === today;
  const canGoPrevious = Boolean(minimumDate && attendanceDate > minimumDate);
  const canGoNext = attendanceDate < maximumDate;
  const presentScopeReady =
    Boolean(academicYearId) &&
    (presentScope === "SCHOOL" || Boolean(classId)) &&
    (presentScope !== "SECTION" || Boolean(sectionId));

  /* ==========================================================================
     CLASS CHANGE
     ========================================================================== */

  function changeClass(value: string) {
    setClassId(value);
    setSectionId("");
  }

  function changeAcademicYear(value: string) {
    setAcademicYearId(value);
    const year = academicYears.find((option) => option.id === value);
    if (year) {
      setAttendanceDate((current) => clampAttendanceDate(current, year, today));
    }
  }

  function moveAttendanceDate(days: number) {
    const next = new Date(`${attendanceDate}T00:00:00`);
    next.setDate(next.getDate() + days);
    const value = [
      next.getFullYear(),
      String(next.getMonth() + 1).padStart(2, "0"),
      String(next.getDate()).padStart(2, "0"),
    ].join("-");

    if ((!minimumDate || value >= minimumDate) && value <= maximumDate) {
      setAttendanceDate(value);
    }
  }

  /* ==========================================================================
     MARK FULL PRESENT
     ========================================================================== */

  async function markFullPresent(scope: "SCHOOL" | "CLASS" | "SECTION") {
    if (!academicYearId) {
      toast.error("Academic year is required.");
      return;
    }

    if ((scope === "CLASS" || scope === "SECTION") && !classId) {
      toast.error("Class is required.");
      return;
    }

    if (scope === "SECTION" && !sectionId) {
      toast.error("Section is required.");
      return;
    }

    /*
     * For SCHOOL scope, we can determine the attendance
     * session type from the academic year's attendance mode.
     *
     * For EVERY_PERIOD, school-wide full present cannot safely
     * create period sessions without knowing the timetable period.
     */
    if (attendanceMode === "EVERY_PERIOD") {
      toast.error(
        "For Every Period attendance, select a class and section, then mark each period.",
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/v1/attendance/full-present", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          academicYearId,

          attendanceDate,

          scope,

          classId: scope !== "SCHOOL" ? classId : undefined,

          sectionId: scope === "SECTION" ? sectionId : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to mark full attendance.");

        return;
      }

      const sessionCount = result.data?.sessionCount ?? 0;

      const attendanceCount = result.data?.attendanceCount ?? 0;

      toast.success(
        `${attendanceCount} students marked present across ${sessionCount} attendance session${
          sessionCount === 1 ? "" : "s"
        }.`,
      );
      refreshTable("attendance");
    } catch {
      toast.error("Failed to mark full attendance.");
    } finally {
      setLoading(false);
    }
  }

  /* ==========================================================================
     RENDER
     ========================================================================== */

  return (
    <div className="min-h-screen w-full space-y-6 bg-[linear-gradient(180deg,rgba(238,242,255,0.55),transparent_24rem)] p-4 pb-12 sm:p-6">
      {/* ======================================================================
          PAGE HEADER
          ====================================================================== */}

      <div className="relative overflow-hidden rounded-[28px] border border-indigo-100/80 bg-white px-5 py-6 shadow-[0_24px_70px_-38px_rgba(30,41,59,0.35)] sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-2/5 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.13),transparent_68%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20">
              <UserCheck className="size-5" />
            </div>
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-indigo-600">
                <Sparkles className="size-3.5" />
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Attendance workspace</span>
              </div>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">Attendance register</h1>
              <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-500">Set the register date and class, then record attendance with a clear, guided workflow.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            {selectedAcademicYear && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5">
                <p className="text-[9px] font-bold tracking-[0.14em] text-slate-400 uppercase">Academic year</p>
                <p className="mt-0.5 text-sm font-bold text-slate-800">{selectedAcademicYear.label}</p>
              </div>
            )}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-2.5">
              <p className="text-[9px] font-bold tracking-[0.14em] text-indigo-400 uppercase">Register mode</p>
              <p className="mt-0.5 text-sm font-bold text-indigo-700">{getModeLabel(attendanceMode)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================================
          ATTENDANCE SETUP
          ====================================================================== */}

      <Card className="overflow-hidden rounded-[24px] border-slate-200/80 bg-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.35)]">
        <CardContent className="p-0">
          <div className="grid xl:grid-cols-[0.82fr_1.35fr]">
            <div className="border-b border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/50 p-5 sm:p-6 xl:border-b-0 xl:border-r">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.18em] text-indigo-500 uppercase">Register date</p>
                  <h2 className="mt-1 text-base font-bold text-slate-900">Choose the school day</h2>
                </div>
                {isToday && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-bold tracking-wide text-emerald-700">TODAY</span>}
              </div>

              <div className="mt-5 flex items-stretch gap-2">
                <button type="button" aria-label="Previous attendance date" disabled={!canGoPrevious || loading} onClick={() => moveAttendanceDate(-1)} className="flex w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-35">
                  <ChevronLeft className="size-4" />
                </button>

                <div className="relative flex min-w-0 flex-1 cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border border-indigo-200 bg-white px-4 py-3 shadow-sm transition hover:border-indigo-300 hover:shadow-md">
                  <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                    <span className="text-[9px] font-bold tracking-wider uppercase">{selectedDate.toLocaleDateString("en-IN", { month: "short" })}</span>
                    <span className="text-lg font-bold leading-5">{selectedDay}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{selectedWeekday}</p>
                    <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{selectedDay} {selectedMonthYear}</p>
                  </div>
                  <CalendarDays className="ml-auto size-4 shrink-0 text-indigo-500" />
                  <input id="attendance-date" aria-label="Attendance date" type="date" value={attendanceDate} min={minimumDate} max={maximumDate} onChange={(event) => { if (event.target.value) setAttendanceDate(event.target.value); }} disabled={loading || !academicYearId} required className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
                </div>

                <button type="button" aria-label="Next attendance date" disabled={!canGoNext || loading} onClick={() => moveAttendanceDate(1)} className="flex w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-35">
                  <ChevronRight className="size-4" />
                </button>
              </div>

              {!isToday && (
                <button type="button" onClick={() => setAttendanceDate(maximumDate)} className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700">Return to today</button>
              )}
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-200"><BookOpenCheck className="size-4" /></div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">Register scope</p>
                  <h2 className="mt-0.5 text-sm font-bold text-slate-900">Select year, class and section</h2>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <AcademicYearSelect value={academicYearId} onChange={changeAcademicYear} disabled={loading} />
                <ClassSelect value={classId} onChange={changeClass} />
                <SectionSelect classId={classId} value={sectionId} onChange={setSectionId} disabled={loading || !classId} />
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200"><Clock3 className="size-3.5" /></div>
                <div>
                  <p className="text-[9px] font-bold tracking-[0.13em] text-slate-400 uppercase">Attendance mode</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-700">{getModeLabel(attendanceMode)}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ======================================================================
          STEP 1 — FULL PRESENT
          ====================================================================== */}

      <Card className="overflow-hidden rounded-[24px] border-slate-200/80 bg-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.35)]">
        <CardContent className="p-0">
          <div className="grid lg:grid-cols-[1.35fr_0.65fr]">
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"><CheckCircle2 className="size-4" /></div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[9px] font-bold tracking-wide text-white">STEP 1</span>
                    <h2 className="text-base font-bold text-slate-900">Start everyone as present</h2>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Choose how widely this action should apply. You can record absent students in the next step.</p>
                </div>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <PresentScopeChoice icon={<Building2 className="size-4" />} label="Whole school" detail="All active sections" selected={presentScope === "SCHOOL"} disabled={!academicYearId} onClick={() => setPresentScope("SCHOOL")} />
                <PresentScopeChoice icon={<GraduationCap className="size-4" />} label="Selected class" detail={classId ? "All class sections" : "Choose a class first"} selected={presentScope === "CLASS"} disabled={!academicYearId || !classId} onClick={() => setPresentScope("CLASS")} />
                <PresentScopeChoice icon={<Users className="size-4" />} label="Selected section" detail={sectionId ? "Current section only" : "Choose a section first"} selected={presentScope === "SECTION"} disabled={!academicYearId || !classId || !sectionId} onClick={() => setPresentScope("SECTION")} />
              </div>
            </div>

            <div className="flex flex-col justify-between border-t border-slate-200 bg-slate-50/70 p-5 sm:p-6 lg:border-l lg:border-t-0">
              <div>
                <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">Ready to apply</p>
                <p className="mt-2 text-lg font-bold text-slate-900">{presentScope === "SCHOOL" ? "Whole school" : presentScope === "CLASS" ? "Selected class" : "Selected section"}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{presentScopeReady ? `Mark the selected scope present for ${selectedDateLabel}.` : "Complete the register scope above to continue."}</p>
              </div>
              <Button type="button" disabled={loading || !presentScopeReady} onClick={() => markFullPresent(presentScope)} className="mt-5 h-11 w-full gap-2 rounded-xl bg-emerald-600 font-semibold text-white shadow-lg shadow-emerald-600/15 hover:bg-emerald-700 disabled:opacity-40 disabled:shadow-none">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                {loading ? "Applying..." : "Mark full present"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <BulkAbsenteeMarker
        key={`${academicYearId}:${classId}:${sectionId}:${attendanceDate}`}
        academicYearId={academicYearId}
        classId={classId}
        sectionId={sectionId}
        attendanceMode={attendanceMode}
        attendanceDate={attendanceDate}
      />
    </div>
  );
}

/* ==========================================================================
   PRESENT SCOPE BUTTON
   ========================================================================== */

function PresentScopeChoice({
  icon,
  label,
  detail,
  selected,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  detail: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${selected ? "border-emerald-300 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/10" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
    >
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-slate-800">{label}</p>
        <p className="mt-0.5 truncate text-[10px] text-slate-500">{detail}</p>
      </div>
      <span className={`size-2.5 shrink-0 rounded-full ${selected ? "bg-emerald-500 ring-4 ring-emerald-100" : "bg-slate-200"}`} />
    </button>
  );
}
