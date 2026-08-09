"use client";

import { useEffect, useMemo, useState } from "react";
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

export function ClassTimetableContainer() {
  const [academicYearId, setAcademicYearId] = useState("");

  const [classId, setClassId] = useState("");

  const [sectionId, setSectionId] = useState("");

  const [data, setData] = useState<TimetableItem[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSectionId("");
    setData([]);
  }, [classId]);

  useEffect(() => {
    if (!academicYearId || !classId || !sectionId) {
      setData([]);
      return;
    }

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

        if (!result.success) {
          toast.error(result.message);
          setData([]);
          return;
        }

        setData(result.data);
      } catch {
        toast.error("Failed to load timetable.");

        setData([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [academicYearId, classId, sectionId]);

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

  function getItem(periodId: string, day: string) {
    return data.find((item) => item.period.id === periodId && item.day === day);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <FormField label="Academic Year">
          <AcademicYearSelect
            value={academicYearId}
            onChange={setAcademicYearId}
          />
        </FormField>

        <FormField label="Class">
          <ClassSelect value={classId} onChange={setClassId} />
        </FormField>

        <FormField label="Section">
          <SectionSelect
            classId={classId}
            value={sectionId}
            disabled={!classId}
            onChange={setSectionId}
          />
        </FormField>
      </div>

      {!academicYearId || !classId || !sectionId ? (
        <div className="rounded-lg border p-10 text-center text-sm text-muted-foreground">
          Select academic year, class and section to view the timetable.
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
                              {item.teacherAllocation.teacher.fullName}
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
