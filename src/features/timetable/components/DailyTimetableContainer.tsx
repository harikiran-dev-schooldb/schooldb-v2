"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Clock3,
  GraduationCap,
  Loader2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { AcademicYearSelect } from "@/components/common/select";
import { FormField } from "@/components/common/forms";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TimetableItem = {
  id: string;
  day: string;
  active: boolean;

  period: {
    id: string;
    name: string;
    displayOrder: number;
    startTime?: string | null;
    endTime?: string | null;
  };

  teacherAllocation: {
    teacher: {
      id: string;
      fullName: string;
    };

    subject: {
      id: string;
      name: string;
    };

    class: {
      id: string;
      name: string;
    };

    section: {
      id: string;
      name: string;
    };
  };
};

const DAYS = [
  {
    value: "MONDAY",
    label: "Monday",
  },
  {
    value: "TUESDAY",
    label: "Tuesday",
  },
  {
    value: "WEDNESDAY",
    label: "Wednesday",
  },
  {
    value: "THURSDAY",
    label: "Thursday",
  },
  {
    value: "FRIDAY",
    label: "Friday",
  },
  {
    value: "SATURDAY",
    label: "Saturday",
  },
];

function getToday() {
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

export function DailyTimetableContainer() {
  const [academicYearId, setAcademicYearId] = useState("");
  const [day, setDay] = useState("");

  const [data, setData] = useState<TimetableItem[]>([]);
  const [loading, setLoading] = useState(false);

  const canLoad = Boolean(academicYearId) && Boolean(day);

  const selectedDay = DAYS.find((item) => item.value === day);

  const isToday = day === getToday();

  useEffect(() => {
    if (!canLoad) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          academicYearId,
          day,
        });

        const response = await fetch(
          `/api/v1/timetables/views/daily?${params.toString()}`,
        );

        const result = await response.json();

        if (cancelled) {
          return;
        }

        if (!result.success) {
          toast.error(result.message ?? "Failed to load timetable.");

          setData([]);
          return;
        }

        setData(result.data);
      } catch {
        if (!cancelled) {
          toast.error("Failed to load timetable.");
          setData([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [canLoad, academicYearId, day]);

  const sortedData = useMemo(() => {
    return [...data].sort(
      (a, b) => a.period.displayOrder - b.period.displayOrder,
    );
  }, [data]);

  const classCount = useMemo(() => {
    return new Set(
      data.map(
        (item) =>
          `${item.teacherAllocation.class.id}:${item.teacherAllocation.section.id}`,
      ),
    ).size;
  }, [data]);

  const subjectCount = useMemo(() => {
    return new Set(data.map((item) => item.teacherAllocation.subject.id)).size;
  }, [data]);

  const teacherCount = useMemo(() => {
    return new Set(data.map((item) => item.teacherAllocation.teacher.id)).size;
  }, [data]);

  function handleAcademicYearChange(value: string) {
    setAcademicYearId(value);
    setData([]);
  }

  function handleDayChange(value: string) {
    setDay(value);
    setData([]);
  }

  return (
    <div className="space-y-5">
      {/* Filter workspace */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b bg-muted/20 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays className="size-5" />
            </div>

            <div>
              <h2 className="text-sm font-semibold">Daily Schedule</h2>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Select an academic year and day to view all scheduled classes.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <FormField label="Academic Year">
            <AcademicYearSelect
              value={academicYearId}
              onChange={handleAcademicYearChange}
            />
          </FormField>

          <FormField label="Day">
            <Select value={day || undefined} onValueChange={handleDayChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>

              <SelectContent>
                {DAYS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                    {item.value === getToday() ? " • Today" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </div>

      {/* Initial state */}
      {!canLoad && (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
            <CalendarDays className="size-6 text-muted-foreground" />
          </div>

          <h3 className="mt-4 text-base font-semibold">
            Select a day to continue
          </h3>

          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Select the academic year and day to display the complete school
            timetable.
          </p>
        </div>
      )}

      {/* Loading */}
      {canLoad && loading && (
        <div className="rounded-2xl border bg-card p-14 text-center shadow-sm">
          <Loader2 className="mx-auto size-7 animate-spin text-primary" />

          <p className="mt-4 text-sm font-medium">Loading daily timetable</p>

          <p className="mt-1 text-xs text-muted-foreground">
            Preparing the school schedule...
          </p>
        </div>
      )}

      {/* Empty */}
      {canLoad && !loading && data.length === 0 && (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
            <Clock3 className="size-6 text-muted-foreground" />
          </div>

          <h3 className="mt-4 font-semibold">No timetable entries</h3>

          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            There are no classes scheduled for{" "}
            {selectedDay?.label ?? "this day"}.
          </p>
        </div>
      )}

      {/* Schedule */}
      {canLoad && !loading && data.length > 0 && (
        <>
          {/* Day heading */}
          <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarDays className="size-5" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight">
                    {selectedDay?.label}
                  </h2>

                  {isToday && (
                    <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                      Today
                    </span>
                  )}
                </div>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  Complete school schedule
                </p>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {data.length}
              </span>{" "}
              scheduled periods
            </div>
          </div>

          {/* Statistics */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<Clock3 className="size-4" />}
              label="Periods"
              value={data.length}
            />

            <StatCard
              icon={<Users className="size-4" />}
              label="Classes"
              value={classCount}
            />

            <StatCard
              icon={<BookOpen className="size-4" />}
              label="Subjects"
              value={subjectCount}
            />

            <StatCard
              icon={<GraduationCap className="size-4" />}
              label="Teachers"
              value={teacherCount}
            />
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-sm md:block">
            <div className="border-b bg-muted/20 px-5 py-4">
              <h2 className="text-sm font-semibold">Scheduled Classes</h2>

              <p className="mt-0.5 text-xs text-muted-foreground">
                All classes, subjects and teachers for the selected day.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Period
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Class
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Subject
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Teacher
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Section
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sortedData.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-bold text-muted-foreground">
                            {item.period.displayOrder}
                          </div>

                          <div>
                            <p className="text-sm font-semibold">
                              {item.period.name}
                            </p>

                            {item.period.startTime && item.period.endTime && (
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {item.period.startTime}
                                {" — "}
                                {item.period.endTime}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <GraduationCap className="size-4" />
                          </div>

                          <span className="text-sm font-semibold">
                            {item.teacherAllocation.class.name}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <BookOpen className="size-4 text-primary" />

                          <span className="text-sm font-semibold">
                            {item.teacherAllocation.subject.name}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm text-muted-foreground">
                          {item.teacherAllocation.teacher.fullName}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold">
                          {item.teacherAllocation.section.name}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {sortedData.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <BookOpen className="size-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold">
                        {item.teacherAllocation.subject.name}
                      </p>

                      <span className="shrink-0 rounded-lg bg-muted px-2 py-1 text-[10px] font-bold">
                        #{item.period.displayOrder}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.period.name}
                      {item.period.startTime && item.period.endTime
                        ? ` • ${item.period.startTime} — ${item.period.endTime}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Class
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {item.teacherAllocation.class.name} -{" "}
                      {item.teacherAllocation.section.name}
                    </p>
                  </div>

                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Teacher
                    </p>

                    <p className="mt-1 truncate text-sm font-semibold">
                      {item.teacherAllocation.teacher.fullName}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </span>

        <div className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          {icon}
        </div>
      </div>

      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
