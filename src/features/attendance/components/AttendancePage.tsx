"use client";

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
  Clock3,
  Loader2,
  Sun,
  Sunrise,
  UserCheck,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export function AttendancePage({ schoolSlug }: Props) {
  const router = useRouter();

  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [loading, setLoading] = useState(false);

  const [timetable, setTimetable] = useState<TimetableOption[]>([]);
  const [timetableLoading, setTimetableLoading] = useState(false);

  useEffect(() => {
    async function loadAcademicYears() {
      try {
        const response = await fetch("/api/v1/academic-years/options");
        const result = await response.json();

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        setAcademicYears(result.data);

        const activeYear = result.data[0];

        if (activeYear) {
          setAcademicYearId(activeYear.id);
        }
      } catch {
        toast.error("Failed to load academic years.");
      }
    }

    loadAcademicYears();
  }, []);

  const selectedAcademicYear = academicYears.find(
    (year) => year.id === academicYearId,
  );

  const attendanceMode = selectedAcademicYear?.attendanceMode ?? "ONCE_DAILY";

  const canLoadTimetable =
    attendanceMode === "EVERY_PERIOD" &&
    Boolean(academicYearId) &&
    Boolean(classId) &&
    Boolean(sectionId);

  function changeClass(value: string) {
    setClassId(value);
    setSectionId("");
  }

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

  useEffect(() => {
    if (!canLoadTimetable) return;

    let cancelled = false;

    async function loadTimetable() {
      try {
        setTimetableLoading(true);

        const day = getTodayWeekDay();

        const params = new URLSearchParams({
          academicYearId,
          classId,
          sectionId,
          day,
        });

        const response = await fetch(
          `/api/v1/attendance/timetable?${params.toString()}`,
        );

        const result = await response.json();

        if (cancelled) return;

        if (!result.success) {
          toast.error(result.message);
          setTimetable([]);
          return;
        }

        setTimetable(result.data);
      } catch {
        if (!cancelled) {
          toast.error("Failed to load today's timetable.");
          setTimetable([]);
        }
      } finally {
        if (!cancelled) {
          setTimetableLoading(false);
        }
      }
    }

    loadTimetable();

    return () => {
      cancelled = true;
    };
  }, [canLoadTimetable, academicYearId, classId, sectionId]);

  const displayTimetable = canLoadTimetable ? timetable : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UserCheck className="size-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Select a class and create an attendance session.
            </p>
          </div>
        </div>

        {selectedAcademicYear && (
          <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-4 py-2 text-sm">
            <CalendarDays className="size-4 text-muted-foreground" />

            <span className="text-muted-foreground">
              {selectedAcademicYear.label}
            </span>
          </div>
        )}
      </div>

      {/* Attendance Setup */}
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpenCheck className="size-5 text-primary" />
            Attendance Setup
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            Choose the academic year, class, and section.
          </p>
        </CardHeader>

        <CardContent className="space-y-6 p-5 sm:p-6">
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

          {/* Selected Mode */}
          <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Attendance Mode</p>

              <p className="mt-1 text-xs text-muted-foreground">
                The session options below are based on the selected academic
                year's attendance configuration.
              </p>
            </div>

            <div className="w-fit rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold">
              {attendanceMode === "ONCE_DAILY" && "Once Daily"}

              {attendanceMode === "MORNING_AFTERNOON" && "Morning & Afternoon"}

              {attendanceMode === "EVERY_PERIOD" && "Every Period"}
            </div>
          </div>

          {/* ONCE DAILY */}
          {attendanceMode === "ONCE_DAILY" && (
            <div className="flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-5 text-primary" />

                  <p className="font-semibold">Daily Attendance</p>
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                  Create one attendance session for the selected class today.
                </p>
              </div>

              <Button
                size="lg"
                className="gap-2"
                disabled={loading || !academicYearId || !classId || !sectionId}
                onClick={() => createSession("DAILY")}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserCheck className="size-4" />
                    Take Attendance
                  </>
                )}
              </Button>
            </div>
          )}

          {/* MORNING + AFTERNOON */}
          {attendanceMode === "MORNING_AFTERNOON" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border p-5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sunrise className="size-5" />
                </div>

                <h3 className="mt-4 font-semibold">Morning Attendance</h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Mark attendance for the morning session.
                </p>

                <Button
                  className="mt-5 w-full gap-2"
                  disabled={
                    loading || !academicYearId || !classId || !sectionId
                  }
                  onClick={() => createSession("MORNING")}
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Morning Attendance
                </Button>
              </div>

              <div className="rounded-xl border p-5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sun className="size-5" />
                </div>

                <h3 className="mt-4 font-semibold">Afternoon Attendance</h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Mark attendance for the afternoon session.
                </p>

                <Button
                  variant="outline"
                  className="mt-5 w-full gap-2"
                  disabled={
                    loading || !academicYearId || !classId || !sectionId
                  }
                  onClick={() => createSession("AFTERNOON")}
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Afternoon Attendance
                </Button>
              </div>
            </div>
          )}

          {/* EVERY PERIOD */}
          {attendanceMode === "EVERY_PERIOD" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Clock3 className="size-5" />
                </div>

                <div>
                  <h2 className="font-semibold">Today&apos;s Periods</h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Select a period to create an attendance session.
                  </p>
                </div>
              </div>

              {!classId || !sectionId ? (
                <div className="rounded-xl border border-dashed p-8 text-center">
                  <p className="font-medium">
                    Select a class and section first
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Today's timetable will appear here.
                  </p>
                </div>
              ) : timetableLoading ? (
                <div className="flex min-h-40 items-center justify-center rounded-xl border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-5 animate-spin" />
                    Loading today&apos;s timetable...
                  </div>
                </div>
              ) : displayTimetable.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center">
                  <Clock3 className="mx-auto size-8 text-muted-foreground" />

                  <p className="mt-3 font-medium">No periods found for today</p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Check the timetable configuration for this class and
                    section.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayTimetable.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-4 rounded-xl border p-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted font-semibold">
                          <Clock3 className="size-5 text-muted-foreground" />
                        </div>

                        <div>
                          <p className="font-semibold">{item.periodName}</p>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.subjectName} · {item.teacherName}
                          </p>
                        </div>
                      </div>

                      <Button
                        className="gap-2"
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
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
