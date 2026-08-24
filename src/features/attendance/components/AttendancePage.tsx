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
  CheckCircle2,
  Clock3,
  Loader2,
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

export function AttendancePage({ schoolSlug }: Props) {
  const router = useRouter();

  const [academicYearId, setAcademicYearId] = useState("");

  const [classId, setClassId] = useState("");

  const [sectionId, setSectionId] = useState("");

  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);

  const [loading, setLoading] = useState(false);

  const [timetable, setTimetable] = useState<TimetableOption[]>([]);

  const [timetableLoading, setTimetableLoading] = useState(false);

  /*
   * ------------------------------------------------------------------------
   * LOAD ACADEMIC YEARS
   * ------------------------------------------------------------------------
   */

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

  const selectedAcademicYear = academicYears.find(
    (year) => year.id === academicYearId,
  );

  const attendanceMode = selectedAcademicYear?.attendanceMode ?? "ONCE_DAILY";

  const canLoadTimetable =
    attendanceMode === "EVERY_PERIOD" &&
    Boolean(academicYearId) &&
    Boolean(classId) &&
    Boolean(sectionId);

  /*
   * ------------------------------------------------------------------------
   * CLASS CHANGE
   * ------------------------------------------------------------------------
   */

  function changeClass(value: string) {
    setClassId(value);
    setSectionId("");
  }

  /*
   * ------------------------------------------------------------------------
   * CREATE SESSION
   * ------------------------------------------------------------------------
   */

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

  /*
   * ------------------------------------------------------------------------
   * LOAD TODAY'S TIMETABLE
   * ------------------------------------------------------------------------
   *
   * IMPORTANT:
   *
   * We no longer do:
   *
   *   setTimetable([])
   *
   * when the prerequisites are missing.
   *
   * The state is simply left untouched until
   * a valid timetable request is made.
   *
   * The UI only renders the timetable when
   * canLoadTimetable is true.
   */

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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* ============================================================ */}
      {/* HEADER                                                       */}
      {/* ============================================================ */}

      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserCheck className="size-5" />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Attendance
            </h1>

            <p className="mt-0.5 text-sm text-muted-foreground">
              Select a class and start today&apos;s attendance.
            </p>
          </div>
        </div>

        {selectedAcademicYear && (
          <div className="flex w-fit items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm shadow-sm">
            <CalendarDays className="size-4 text-primary" />

            <span className="font-medium">{selectedAcademicYear.label}</span>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* SETUP                                                        */}
      {/* ============================================================ */}

      <Card className="overflow-hidden">
        <div className="border-b bg-muted/20 px-5 py-4">
          <div className="flex items-center gap-3">
            <BookOpenCheck className="size-5 text-primary" />

            <div>
              <h2 className="text-sm font-semibold">Attendance Setup</h2>

              <p className="text-xs text-muted-foreground">
                Choose the academic year, class and section.
              </p>
            </div>
          </div>
        </div>

        <CardContent className="space-y-5 p-5">
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

          {/* MODE */}
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Attendance Mode
              </p>

              <p className="mt-1 text-sm">{getModeLabel(attendanceMode)}</p>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="size-2 rounded-full bg-primary" />
              Configuration active
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* ONCE DAILY                                                   */}
      {/* ============================================================ */}

      {attendanceMode === "ONCE_DAILY" && (
        <Card>
          <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarDays className="size-5" />
              </div>

              <div>
                <h2 className="font-semibold">Daily Attendance</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Create one attendance session for the selected class today.
                </p>
              </div>
            </div>

            <Button
              size="lg"
              className="gap-2 sm:min-w-[180px]"
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

      {/* ============================================================ */}
      {/* MORNING / AFTERNOON                                          */}
      {/* ============================================================ */}

      {attendanceMode === "MORNING_AFTERNOON" && (
        <div className="grid gap-4 md:grid-cols-2">
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

      {/* ============================================================ */}
      {/* EVERY PERIOD                                                 */}
      {/* ============================================================ */}

      {attendanceMode === "EVERY_PERIOD" && (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/20 px-5 py-4">
            <div className="flex items-center gap-3">
              <Clock3 className="size-5 text-primary" />

              <div>
                <h2 className="text-sm font-semibold">Today&apos;s Periods</h2>

                <p className="text-xs text-muted-foreground">
                  Select a period to create an attendance session.
                </p>
              </div>
            </div>
          </div>

          <CardContent className="p-5">
            {!classId || !sectionId ? (
              <EmptyState
                title="Select a class and section"
                description="Today's timetable will appear here."
              />
            ) : timetableLoading ? (
              <div className="flex min-h-36 items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                  Loading today&apos;s timetable...
                </div>
              </div>
            ) : timetable.length === 0 ? (
              <EmptyState
                icon={
                  <Clock3 className="mx-auto size-8 text-muted-foreground" />
                }
                title="No periods found"
                description="There are no timetable periods configured for this class and section today."
              />
            ) : (
              <div className="divide-y rounded-xl border">
                {timetable.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted font-medium">
                        <Clock3 className="size-4 text-muted-foreground" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{item.periodName}</p>

                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            {item.day}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.subjectName}

                          <span className="mx-1.5">·</span>

                          {item.teacherName}
                        </p>
                      </div>
                    </div>

                    <Button
                      className="gap-2 sm:min-w-[165px]"
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
          </CardContent>
        </Card>
      )}

      {/* ============================================================ */}
      {/* FOOTNOTE                                                      */}
      {/* ============================================================ */}

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="size-3.5" />
        Attendance sessions are created for the selected class and section.
      </div>
    </div>
  );
}

/* ========================================================================== */
/* ATTENDANCE OPTION                                                          */
/* ========================================================================== */

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
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  secondary?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>

        <h2 className="mt-4 font-semibold">{title}</h2>

        <p className="mt-1 flex-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>

        <Button
          variant={secondary ? "outline" : "default"}
          className="mt-5 w-full gap-2"
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

/* ========================================================================== */
/* EMPTY STATE                                                                */
/* ========================================================================== */

function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-center">
      {icon}

      <p className="font-medium">{title}</p>

      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
