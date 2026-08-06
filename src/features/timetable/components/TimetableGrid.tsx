"use client";

import { WEEKDAY_OPTIONS } from "../constants/weekdays";
import { TimetableGridItem } from "../types";
import { TimetableCell } from "./TimetableCell";

type Props = {
  data: TimetableGridItem[];
};

export function TimetableGrid({ data }: Props) {
  const periods = Array.from(
    new Map(data.map((item) => [item.period.id, item.period])).values(),
  );

  return (
    <div className="overflow-auto rounded-lg border">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border p-3 text-left">Period</th>

            {WEEKDAY_OPTIONS.map((day) => (
              <th key={day.value} className="border p-3 text-center">
                {day.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {periods.map((period) => (
            <tr key={period.id}>
              <td className="border p-3 font-medium">
                <div>{period.name}</div>

                <div className="text-xs text-muted-foreground">
                  {period.startTime} - {period.endTime}
                </div>
              </td>

              {WEEKDAY_OPTIONS.map((day) => {
                const lesson = data.find(
                  (x) => x.period.id === period.id && x.day === day.value,
                );

                return (
                  <td key={day.value} className="border align-top p-2">
                    {lesson ? (
                      <TimetableCell
                        subject={lesson.subject.name}
                        teacher={lesson.teacher.fullName}
                      />
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
