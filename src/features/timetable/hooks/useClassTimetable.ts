"use client";

import { useEffect, useState } from "react";

import { TimetableGridItem } from "../types";

export function useClassTimetable(
  academicYearId?: string,
  classId?: string,
  sectionId?: string
) {
  const [loading, setLoading] =
    useState(false);

  const [data, setData] =
    useState<TimetableGridItem[]>([]);

  useEffect(() => {
    if (
      !academicYearId ||
      !classId ||
      !sectionId
    ) {
      setData([]);
      return;
    }

    async function load() {
      setLoading(true);

      try {
        const params = new URLSearchParams({
  academicYearId: academicYearId!,
  classId: classId!,
  sectionId: sectionId!,
});

        const res = await fetch(
          `/api/v1/timetables/views/class?${params}`
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
  }, [
    academicYearId,
    classId,
    sectionId,
  ]);

  return {
    loading,
    data,
  };
}