"use client";

import { useEffect, useState } from "react";

import { TimetableGridItem } from "../types";

export function useDailyTimetable(
  academicYearId?: string,
  day?: string
) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TimetableGridItem[]>([]);

  useEffect(() => {
    if (!academicYearId || !day) {
      setData([]);
      return;
    }

    async function load() {
      setLoading(true);

      try {
        const params = new URLSearchParams({
  academicYearId: academicYearId!,
    day: day!,
});

        const res = await fetch(
          `/api/v1/timetables/views/daily?${params}`
        );

        const result = await res.json();

        if (result.success) {
          setData(result.data);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [academicYearId, day]);

  return {
    loading,
    data,
  };
}