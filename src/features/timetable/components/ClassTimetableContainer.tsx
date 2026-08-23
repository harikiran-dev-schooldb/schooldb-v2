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

import {
  AcademicYearSelect,
  ClassSelect,
  SectionSelect,
} from "@/components/common/select";

import { FormField } from "@/components/common/forms";

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
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

function formatDay(day: string) {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

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

export function ClassTimetableContainer() {
  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [data, setData] = useState<TimetableItem[]>([]);
  const [loading, setLoading] = useState(false);

  const canLoad =
    Boolean(academicYearId) && Boolean(classId) && Boolean(sectionId);

  const today = getToday();

  function handleClassChange(value: string) {
    setClassId(value);
    setSectionId("");
    setData([]);
  }

  function handleAcademicYearChange(value: string) {
    setAcademicYearId(value);
    setClassId("");
    setSectionId("");
    setData([]);
  }

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
          classId,
          sectionId,
        });

        const response = await fetch(
          `/api/v1/timetables/views/class?${params.toString()}`,
        );

        const result = await response.json();

        if (cancelled) {
          return;
        }

        if (!result.success) {
          toast.error(result.message);
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
  }, [canLoad, academicYearId, classId, sectionId]);

  const visibleData = useMemo(() => {
    return canLoad ? data : [];
  }, [canLoad, data]);

  const periods = useMemo(() => {
    const map = new Map<string, TimetableItem["period"]>();

    for (const item of visibleData) {
      if (!map.has(item.period.id)) {
        map.set(item.period.id, item.period);
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );
  }, [visibleData]);

  const scheduledCount = visibleData.length;

  const teacherCount = useMemo(() => {
    return new Set(visibleData.map((item) => item.teacherAllocation.teacher.id))
      .size;
  }, [visibleData]);

  const subjectCount = useMemo(() => {
    return new Set(visibleData.map((item) => item.teacherAllocation.subject.id))
      .size;
  }, [visibleData]);

  function getItem(periodId: string, day: string) {
    return visibleData.find(
      (item) => item.period.id === periodId && item.day === day,
    );
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
              <h2 className="text-sm font-semibold">Schedule Workspace</h2>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Choose a class to view its weekly timetable.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-3">
          <FormField label="Academic Year">
            <AcademicYearSelect
              value={academicYearId}
              onChange={handleAcademicYearChange}
            />
          </FormField>

          <FormField label="Class">
            <ClassSelect value={classId} onChange={handleClassChange} />
          </FormField>

          <FormField label="Section">
            <SectionSelect
              classId={classId}
              value={sectionId}
              disabled={!classId}
              onChange={(value) => {
                setSectionId(value);
                setData([]);
              }}
            />
          </FormField>
        </div>
      </div>

      {/* Initial state */}
      {!canLoad && (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
            <GraduationCap className="size-6 text-muted-foreground" />
          </div>

          <h3 className="mt-4 text-base font-semibold">
            Select a class to continue
          </h3>

          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Select the academic year, class and section to display the complete
            weekly timetable.
          </p>
        </div>
      )}

      {/* Loading */}
      {canLoad && loading && (
        <div className="rounded-2xl border bg-card p-14 text-center shadow-sm">
          <Loader2 className="mx-auto size-7 animate-spin text-primary" />

          <p className="mt-4 text-sm font-medium">Loading timetable</p>

          <p className="mt-1 text-xs text-muted-foreground">
            Preparing the weekly schedule...
          </p>
        </div>
      )}

      {/* Empty */}
      {canLoad && !loading && visibleData.length === 0 && (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
            <CalendarDays className="size-6 text-muted-foreground" />
          </div>

          <h3 className="mt-4 font-semibold">No timetable entries</h3>

          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            No timetable has been configured for the selected class and section.
          </p>
        </div>
      )}

      {/* Timetable */}
      {canLoad && !loading && visibleData.length > 0 && (
        <>
          {/* Statistics */}
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              icon={<Clock3 className="size-4" />}
              label="Scheduled Periods"
              value={scheduledCount}
            />

            <StatCard
              icon={<BookOpen className="size-4" />}
              label="Subjects"
              value={subjectCount}
            />

            <StatCard
              icon={<Users className="size-4" />}
              label="Teachers"
              value={teacherCount}
            />
          </div>

          {/* Timetable */}
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="border-b bg-muted/20 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">Weekly Schedule</h2>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  Subject and teacher allocation by period.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] border-collapse">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="sticky left-0 z-20 w-[180px] border-r bg-muted/40 p-4 text-left">
                      <div className="flex items-center gap-2">
                        <Clock3 className="size-4 text-muted-foreground" />

                        <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                          Period
                        </span>
                      </div>
                    </th>

                    {DAYS.map((day) => {
                      const isToday = day === today;

                      return (
                        <th
                          key={day}
                          className={[
                            "min-w-[155px] border-r p-3 text-center last:border-r-0",
                            isToday ? "bg-primary/[0.06]" : "",
                          ].join(" ")}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={[
                                "text-xs font-bold uppercase tracking-wider",
                                isToday
                                  ? "text-primary"
                                  : "text-muted-foreground",
                              ].join(" ")}
                            >
                              {formatDay(day)}
                            </span>

                            {isToday && (
                              <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
                                Today
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {periods.map((period) => (
                    <tr key={period.id} className="border-b last:border-b-0">
                      {/* Period */}
                      <td className="sticky left-0 z-10 border-r bg-card p-4 align-top">
                        <div className="flex items-start gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-bold text-muted-foreground">
                            {period.displayOrder}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {period.name}
                            </p>

                            {period.startTime && period.endTime && (
                              <p className="mt-1 whitespace-nowrap text-[11px] text-muted-foreground">
                                {period.startTime}
                                {" — "}
                                {period.endTime}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Days */}
                      {DAYS.map((day) => {
                        const item = getItem(period.id, day);

                        const isToday = day === today;

                        return (
                          <td
                            key={day}
                            className={[
                              "border-r p-2 align-top last:border-r-0",
                              isToday ? "bg-primary/[0.025]" : "",
                            ].join(" ")}
                          >
                            {item ? (
                              <div className="group relative min-h-[108px] overflow-hidden rounded-xl border bg-background p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                                <div className="absolute inset-y-0 left-0 w-1 bg-primary" />

                                <div className="pl-2">
                                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <BookOpen className="size-4" />
                                  </div>

                                  <p className="mt-3 line-clamp-2 text-sm font-semibold leading-tight">
                                    {item.teacherAllocation.subject.name}
                                  </p>

                                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                    <Users className="size-3.5 shrink-0" />

                                    <span className="truncate">
                                      {item.teacherAllocation.teacher.fullName}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex min-h-[108px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/[0.12]">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/40">
                                  Free
                                </span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary" />
              Scheduled period
            </div>

            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-muted-foreground/30" />
              Free period
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold text-primary-foreground">
                TODAY
              </span>
              Current day
            </div>
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
