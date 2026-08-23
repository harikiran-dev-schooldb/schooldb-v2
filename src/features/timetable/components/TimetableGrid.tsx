"use client";

import { BookOpen, CalendarDays, Clock3, UserRound } from "lucide-react";

import { WEEKDAY_OPTIONS } from "../constants/weekdays";
import { TimetableGridItem } from "../types";
import { TimetableCell } from "./TimetableCell";

type Props = {
  data: TimetableGridItem[];
};

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

export function TimetableGrid({ data }: Props) {
  const periods = Array.from(
    new Map(data.map((item) => [item.period.id, item.period])).values(),
  ).sort((a, b) => a.displayOrder - b.displayOrder);

  const today = getToday();

  const scheduledSlots = data.length;

  const totalSlots = periods.length * WEEKDAY_OPTIONS.length;

  const freeSlots = Math.max(0, totalSlots - scheduledSlots);

  if (periods.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
          <CalendarDays className="size-6 text-muted-foreground" />
        </div>

        <h3 className="mt-4 text-base font-semibold">No timetable available</h3>

        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          There are no timetable entries for the selected academic year, class
          and section.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Summary
          icon={<Clock3 className="size-4" />}
          label="Periods"
          value={periods.length}
        />

        <Summary
          icon={<BookOpen className="size-4" />}
          label="Scheduled"
          value={scheduledSlots}
        />

        <Summary
          icon={<CalendarDays className="size-4" />}
          label="Free Slots"
          value={freeSlots}
        />
      </div>

      {/* Grid */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead>
              <tr className="border-b bg-muted/30">
                {/* Period header */}
                <th className="sticky left-0 z-20 w-[170px] border-r bg-muted/40 p-4 text-left">
                  <div className="flex items-center gap-2">
                    <Clock3 className="size-4 text-muted-foreground" />

                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Period
                    </span>
                  </div>
                </th>

                {WEEKDAY_OPTIONS.map((day) => {
                  const active = day.value === today;

                  return (
                    <th
                      key={day.value}
                      className={[
                        "min-w-[145px] border-r p-3 text-center last:border-r-0",
                        active ? "bg-primary/[0.06]" : "",
                      ].join(" ")}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={[
                            "text-xs font-bold uppercase tracking-wider",
                            active ? "text-primary" : "text-muted-foreground",
                          ].join(" ")}
                        >
                          {day.label}
                        </span>

                        {active && (
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
                <tr key={period.id} className="group border-b last:border-b-0">
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

                        <p className="mt-1 whitespace-nowrap text-[11px] text-muted-foreground">
                          {period.startTime} — {period.endTime}
                        </p>
                      </div>
                    </div>
                  </td>

                  {WEEKDAY_OPTIONS.map((day) => {
                    const lesson = data.find(
                      (item) =>
                        item.period.id === period.id && item.day === day.value,
                    );

                    const isToday = day.value === today;

                    return (
                      <td
                        key={day.value}
                        className={[
                          "border-r p-2 align-top last:border-r-0",
                          isToday ? "bg-primary/[0.025]" : "",
                        ].join(" ")}
                      >
                        {lesson ? (
                          <TimetableCell
                            subject={lesson.subject.name}
                            teacher={lesson.teacher.fullName}
                          />
                        ) : (
                          <div className="flex min-h-[105px] items-center justify-center rounded-xl border border-dashed border-border/60">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40">
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
          Selected timetable
        </div>

        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-muted-foreground/30" />
          Free period
        </div>

        <div className="flex items-center gap-2">
          <UserRound className="size-3.5" />
          Teacher shown inside each subject
        </div>
      </div>
    </div>
  );
}

function Summary({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>

        <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
      </div>

      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
