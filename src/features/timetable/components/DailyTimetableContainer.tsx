"use client";

import { useEffect, useState } from "react";
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

export function DailyTimetableContainer() {
  const [academicYearId, setAcademicYearId] = useState("");

  const [day, setDay] = useState("");

  const [data, setData] = useState<TimetableItem[]>([]);

  const [loading, setLoading] = useState(false);

  const canLoad = Boolean(academicYearId) && Boolean(day);

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
  }, [canLoad, academicYearId, day]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Academic Year">
          <AcademicYearSelect
            value={academicYearId}
            onChange={handleAcademicYearChange}
          />
        </FormField>

        <FormField label="Day">
          <Select value={day} onValueChange={handleDayChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select Day" />
            </SelectTrigger>

            <SelectContent>
              {DAYS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      {!academicYearId || !day ? (
        <div className="rounded-lg border p-10 text-center text-sm text-muted-foreground">
          Select academic year and day to view the timetable.
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
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="border-b border-r p-3 text-left text-sm font-semibold">
                  Period
                </th>

                <th className="border-b border-r p-3 text-left text-sm font-semibold">
                  Class
                </th>

                <th className="border-b border-r p-3 text-left text-sm font-semibold">
                  Subject
                </th>

                <th className="border-b border-r p-3 text-left text-sm font-semibold">
                  Teacher
                </th>

                <th className="border-b p-3 text-left text-sm font-semibold">
                  Section
                </th>
              </tr>
            </thead>

            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="border-b border-r p-3">
                    <div className="font-medium">{item.period.name}</div>

                    {item.period.startTime && item.period.endTime && (
                      <div className="text-xs text-muted-foreground">
                        {item.period.startTime} - {item.period.endTime}
                      </div>
                    )}
                  </td>

                  <td className="border-b border-r p-3">
                    {item.teacherAllocation.class.name}
                  </td>

                  <td className="border-b border-r p-3 font-medium">
                    {item.teacherAllocation.subject.name}
                  </td>

                  <td className="border-b border-r p-3">
                    {item.teacherAllocation.teacher.fullName}
                  </td>

                  <td className="border-b p-3">
                    {item.teacherAllocation.section.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  function handleAcademicYearChange(value: string) {
    setAcademicYearId(value);
    setData([]);
  }

  function handleDayChange(value: string) {
    setDay(value);
    setData([]);
  }
}
