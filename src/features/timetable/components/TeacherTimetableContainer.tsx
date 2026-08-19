"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AcademicYearSelect, TeacherSelect } from "@/components/common/select";

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

export function TeacherTimetableContainer() {
  const [academicYearId, setAcademicYearId] = useState("");

  const [teacherId, setTeacherId] = useState("");

  const [data, setData] = useState<TimetableItem[]>([]);

  const [loading, setLoading] = useState(false);

  const canLoad = Boolean(academicYearId) && Boolean(teacherId);

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
          teacherId,
        });

        const response = await fetch(
          `/api/v1/timetables/views/teacher?${params.toString()}`,
        );

        const result = await response.json();

        if (cancelled) {
          return;
        }

        if (!result.success) {
          toast.error(result.message ?? "Failed to load timetable.");
          return;
        }

        setData(result.data);
      } catch {
        if (!cancelled) {
          toast.error("Failed to load timetable.");
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
  }, [canLoad, academicYearId, teacherId]);

  const periods = useMemo(() => {
    const map = new Map<string, TimetableItem["period"]>();

    for (const item of data) {
      if (!map.has(item.period.id)) {
        map.set(item.period.id, item.period);
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );
  }, [data]);

  function handleAcademicYearChange(value: string) {
    setAcademicYearId(value);
    setData([]);
  }

  function handleTeacherChange(value: string) {
    setTeacherId(value);
    setData([]);
  }

  function getItem(periodId: string, day: string) {
    return data.find((item) => item.period.id === periodId && item.day === day);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Academic Year">
          <AcademicYearSelect
            value={academicYearId}
            onChange={handleAcademicYearChange}
          />
        </FormField>

        <FormField label="Teacher">
          <TeacherSelect value={teacherId} onChange={handleTeacherChange} />
        </FormField>
      </div>

      {!canLoad ? (
        <div className="rounded-lg border p-10 text-center text-sm text-muted-foreground">
          Select academic year and teacher to view the timetable.
        </div>
      ) : loading ? (
        <div className="rounded-lg border p-10 text-center text-sm text-muted-foreground">
          Loading timetable...
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-lg border p-10 text-center text-sm text-muted-foreground">
          No timetable entries found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="border-b border-r p-3 text-left text-sm font-semibold">
                  Period
                </th>

                {DAYS.map((day) => (
                  <th
                    key={day}
                    className="border-b border-r p-3 text-center text-sm font-semibold last:border-r-0"
                  >
                    {formatDay(day)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {periods.map((period) => (
                <tr key={period.id}>
                  <td className="border-b border-r p-3 align-top">
                    <div className="font-medium">{period.name}</div>

                    {period.startTime && period.endTime && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {period.startTime} - {period.endTime}
                      </div>
                    )}
                  </td>

                  {DAYS.map((day) => {
                    const item = getItem(period.id, day);

                    return (
                      <td
                        key={day}
                        className="h-24 border-b border-r p-2 align-top last:border-r-0"
                      >
                        {item ? (
                          <div className="rounded-md border bg-card p-3">
                            <div className="font-medium">
                              {item.teacherAllocation.subject.name}
                            </div>

                            <div className="mt-1 text-xs text-muted-foreground">
                              {item.teacherAllocation.class.name} -{" "}
                              {item.teacherAllocation.section.name}
                            </div>
                          </div>
                        ) : (
                          <div className="flex h-full min-h-16 items-center justify-center text-xs text-muted-foreground">
                            —
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
      )}
    </div>
  );
}

function formatDay(day: string) {
  return day.charAt(0) + day.slice(1).toLowerCase();
}
