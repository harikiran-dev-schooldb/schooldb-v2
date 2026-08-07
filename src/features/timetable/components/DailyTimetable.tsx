"use client";

import { useState } from "react";

import { AcademicYearSelect } from "@/components/common/select";

import { WEEKDAY_OPTIONS } from "../constants/weekdays";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useDailyTimetable } from "../hooks/useDailyTimetable";

export function DailyTimetable() {
  const [academicYearId, setAcademicYearId] = useState("");
  const [day, setDay] = useState("");

  const { data } = useDailyTimetable(academicYearId, day);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <AcademicYearSelect
          value={academicYearId}
          onChange={setAcademicYearId}
        />

        <Select value={day} onValueChange={setDay}>
          <SelectTrigger>
            <SelectValue placeholder="Select Day" />
          </SelectTrigger>

          <SelectContent>
            {WEEKDAY_OPTIONS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.id} className="rounded-lg border p-4">
            <div className="font-semibold">{item.period.name}</div>

            <div className="text-sm text-muted-foreground">
              {item.period.startTime} - {item.period.endTime}
            </div>

            <div className="mt-3">
              <div className="font-medium">{item.subject.name}</div>

              <div className="text-sm">{item.teacher.fullName}</div>

              <div className="text-xs text-muted-foreground">
                {item.class.name} - {item.section.name}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
