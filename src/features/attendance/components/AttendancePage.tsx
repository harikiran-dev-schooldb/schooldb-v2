"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AcademicYearSelect,
  ClassSelect,
  SectionSelect,
} from "@/components/common/select";
import {
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  Sparkles,
  Sun,
  Sunrise,
  UserCheck,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AttendanceMode = "ONCE_DAILY" | "MORNING_AFTERNOON" | "EVERY_PERIOD";

type AcademicYearOption = {
  id: string;
  label: string;
  attendanceMode: AttendanceMode;
};

type TimetableOption = {
  id: string;
  periodId: string;
  periodName: string;
  day: string;
  subjectName: string;
  teacherName: string;
};

type Props = {
  schoolSlug: string;
};

/* ==========================================================================
   HELPERS
   ========================================================================== */

function getTodayWeekDay(): string {
  const days = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];

  return days[new Date().getDay()];
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

export function AttendancePage({ schoolSlug }: Props) {
  const router = useRouter();

  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);

  const [loading, setLoading] = useState(false);

  const [timetable, setTimetable] = useState<TimetableOption[]>([]);

  const [timetableLoading, setTimetableLoading] = useState(false);

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

        const activeYear = options[0];

        if (activeYear) {
          setAcademicYearId(activeYear.id);
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

  /* ==========================================================================
     TIMETABLE CONDITION
     ========================================================================== */

  const canLoadTimetable =
    attendanceMode === "EVERY_PERIOD" &&
    Boolean(academicYearId) &&
    Boolean(classId) &&
    Boolean(sectionId);

  /* ==========================================================================
     CLASS CHANGE
     ========================================================================== */

  function changeClass(value: string) {
    setClassId(value);
    setSectionId("");
  }

  /* ==========================================================================
     CREATE ATTENDANCE SESSION
     ========================================================================== */

  async function createSession(
    sessionType: "DAILY" | "MORNING" | "AFTERNOON" | "PERIOD",
    timetableId?: string,
  ) {
    if (!academicYearId) {
      toast.error("Academic year is required.");
      return;
    }

    if (!classId) {
      toast.error("Class is required.");
      return;
    }

    if (!sectionId) {
      toast.error("Section is required.");
      return;
    }

    if (sessionType === "PERIOD" && !timetableId) {
      toast.error("Timetable is required.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/v1/attendance/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionType,
          timetableId,
          academicYearId,
          classId,
          sectionId,
          attendanceDate: new Date().toISOString().split("T")[0],
        }),
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      router.push(`/${schoolSlug}/attendance/session/${result.data.id}`);
    } catch {
      toast.error("Failed to create attendance session.");
    } finally {
      setLoading(false);
    }
  }

  /* ==========================================================================
     LOAD TODAY'S TIMETABLE
     ========================================================================== */

  useEffect(() => {
    if (!canLoadTimetable) {
      return;
    }

    const controller = new AbortController();

    const loadTimetable = async () => {
      try {
        setTimetableLoading(true);

        const params = new URLSearchParams({
          academicYearId,
          classId,
          sectionId,
          day: getTodayWeekDay(),
        });

        const response = await fetch(
          `/api/v1/attendance/timetable?${params.toString()}`,
          {
            signal: controller.signal,
          },
        );

        const result = await response.json();

        if (controller.signal.aborted) {
          return;
        }

        if (!result.success) {
          toast.error(result.message);
          setTimetable([]);
          return;
        }

        setTimetable((result.data ?? []) as TimetableOption[]);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (!controller.signal.aborted) {
          toast.error("Failed to load today's timetable.");

          setTimetable([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setTimetableLoading(false);
        }
      }
    };

    void loadTimetable();

    return () => {
      controller.abort();
    };
  }, [canLoadTimetable, academicYearId, classId, sectionId]);

  /* ==========================================================================
     RENDER
     ========================================================================== */

  return (
    <div className="w-full space-y-7 pb-10">
      {/* ======================================================================
          PAGE HEADER
          ====================================================================== */}

      <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
            <UserCheck className="size-5" strokeWidth={2} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="size-3 text-indigo-500" />

              <span className="text-[10px] font-bold tracking-[0.18em] text-indigo-600 uppercase">
                Attendance
              </span>
            </div>

            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
              Attendance
            </h1>

            <p className="mt-0.5 text-sm text-slate-500">
              Select a class and start today&apos;s attendance.
            </p>
          </div>
        </div>

        {selectedAcademicYear && (
          <div className="flex w-fit items-center gap-2 rounded-xl border border-indigo-100 bg-white px-3.5 py-2.5 text-sm shadow-sm">
            <CalendarDays className="size-4 text-indigo-600" />

            <span className="font-semibold text-slate-700">
              {selectedAcademicYear.label}
            </span>
          </div>
        )}
      </div>

      {/* ======================================================================
          ATTENDANCE SETUP
          ====================================================================== */}

      <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        {/* Header */}

        <div className="border-b border-slate-200/70 bg-gradient-to-r from-white to-indigo-50/30 px-5 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
              <BookOpenCheck className="size-4" strokeWidth={2} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Attendance Setup
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Choose the academic year, class and section.
              </p>
            </div>
          </div>
        </div>

        <CardContent className="space-y-5 p-5 md:p-6">
          {/* Selectors */}

          <div className="grid gap-4 md:grid-cols-3">
            <AcademicYearSelect
              value={academicYearId}
              onChange={setAcademicYearId}
              disabled={loading}
            />

            <ClassSelect value={classId} onChange={changeClass} />

            <SectionSelect
              classId={classId}
              value={sectionId}
              onChange={setSectionId}
              disabled={loading || !classId}
            />
          </div>

          {/* Attendance Mode */}

          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
                Attendance Mode
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {getModeLabel(attendanceMode)}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
              <span className="size-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.35)]" />
              Configuration active
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ======================================================================
          ONCE DAILY
          ====================================================================== */}

      {attendanceMode === "ONCE_DAILY" && (
        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <CardContent className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div className="flex min-w-0 items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                <CalendarDays className="size-5" strokeWidth={2} />
              </div>

              <div className="min-w-0">
                <h2 className="font-bold text-slate-900">Daily Attendance</h2>

                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Create one attendance session for the selected class today.
                </p>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full gap-2 rounded-xl bg-indigo-600 shadow-[0_8px_20px_rgba(79,70,229,0.18)] hover:bg-indigo-700 sm:w-auto sm:min-w-[180px]"
              disabled={loading || !academicYearId || !classId || !sectionId}
              onClick={() => createSession("DAILY")}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserCheck className="size-4" />
              )}

              {loading ? "Creating..." : "Take Attendance"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ======================================================================
          MORNING / AFTERNOON
          ====================================================================== */}

      {attendanceMode === "MORNING_AFTERNOON" && (
        <div className="grid gap-5 md:grid-cols-2">
          <AttendanceOption
            icon={<Sunrise className="size-5" />}
            title="Morning Attendance"
            description="Mark attendance for the morning session."
            buttonLabel="Take Morning Attendance"
            loading={loading}
            disabled={loading || !academicYearId || !classId || !sectionId}
            onClick={() => createSession("MORNING")}
          />

          <AttendanceOption
            icon={<Sun className="size-5" />}
            title="Afternoon Attendance"
            description="Mark attendance for the afternoon session."
            buttonLabel="Take Afternoon Attendance"
            loading={loading}
            disabled={loading || !academicYearId || !classId || !sectionId}
            onClick={() => createSession("AFTERNOON")}
            secondary
          />
        </div>
      )}

      {/* ======================================================================
          EVERY PERIOD
          ====================================================================== */}

      {attendanceMode === "EVERY_PERIOD" && (
        <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          {/* Header */}

          <div className="border-b border-slate-200/70 bg-gradient-to-r from-white to-indigo-50/30 px-5 py-4 md:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                <Clock3 className="size-4" strokeWidth={2} />
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Today&apos;s Periods
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Select a period to create an attendance session.
                </p>
              </div>
            </div>
          </div>

          <CardContent className="p-5 md:p-6">
            {/* No class / section */}

            {!classId || !sectionId ? (
              <EmptyState
                icon={<Clock3 className="size-7 text-slate-400" />}
                title="Select a class and section"
                description="Today's timetable will appear here."
              />
            ) : timetableLoading ? (
              /* Loading */

              <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="size-5 animate-spin text-indigo-500" />
                  Loading today&apos;s timetable...
                </div>
              </div>
            ) : timetable.length === 0 ? (
              /* Empty */

              <EmptyState
                icon={<Clock3 className="size-7 text-slate-400" />}
                title="No periods found"
                description="There are no timetable periods configured for this class and section today."
              />
            ) : (
              /* Timetable */

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="divide-y divide-slate-200">
                  {timetable.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-4 p-4 transition-colors hover:bg-indigo-50/30 sm:flex-row sm:items-center sm:justify-between md:px-5"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                          <Clock3 className="size-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">
                              {item.periodName}
                            </p>

                            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                              {item.day}
                            </span>
                          </div>

                          <p className="mt-1 truncate text-sm text-slate-500">
                            {item.subjectName}

                            <span className="mx-1.5 text-slate-300">·</span>

                            {item.teacherName}
                          </p>
                        </div>
                      </div>

                      <Button
                        className="w-full gap-2 rounded-xl bg-indigo-600 shadow-sm hover:bg-indigo-700 sm:w-auto sm:min-w-[170px]"
                        disabled={loading}
                        onClick={() => createSession("PERIOD", item.id)}
                      >
                        {loading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <UserCheck className="size-4" />
                        )}
                        Take Attendance
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ======================================================================
          FOOTNOTE
          ====================================================================== */}

      <div className="flex flex-wrap items-center justify-center gap-2 px-4 text-center text-xs text-slate-400">
        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />

        <span>
          Attendance sessions are created for the selected class and section.
        </span>
      </div>
    </div>
  );
}

/* ==========================================================================
   ATTENDANCE OPTION
   ========================================================================== */

function AttendanceOption({
  icon,
  title,
  description,
  buttonLabel,
  loading,
  disabled,
  onClick,
  secondary = false,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  secondary?: boolean;
}) {
  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <CardContent className="flex h-full flex-col p-5 md:p-6">
        <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
          {icon}
        </div>

        <h2 className="mt-4 font-bold text-slate-900">{title}</h2>

        <p className="mt-1 flex-1 text-sm leading-6 text-slate-500">
          {description}
        </p>

        <Button
          variant={secondary ? "outline" : "default"}
          className={
            secondary
              ? "mt-5 w-full gap-2 rounded-xl border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
              : "mt-5 w-full gap-2 rounded-xl bg-indigo-600 shadow-sm hover:bg-indigo-700"
          }
          disabled={disabled}
          onClick={onClick}
        >
          {loading && <Loader2 className="size-4 animate-spin" />}

          {buttonLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ==========================================================================
   EMPTY STATE
   ========================================================================== */

function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-8 text-center">
      <div className="flex size-11 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
        {icon}
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-700">{title}</p>

      <p className="mt-1 max-w-md text-sm leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}
