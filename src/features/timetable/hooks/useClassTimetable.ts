"use client";

import { useEffect, useState } from "react";

import { TimetableGridItem } from "../types";

export function useClassTimetable(
  academicYearId?: string,
  classId?: string,
  sectionId?: string
) {
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState<TimetableGridItem[]>([]);

  const canLoad = Boolean(
    academicYearId &&
      classId &&
      sectionId
  );

  useEffect(() => {
    if (!canLoad) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          academicYearId: academicYearId!,
          classId: classId!,
          sectionId: sectionId!,
        });

        const res = await fetch(
          `/api/v1/timetables/views/class?${params.toString()}`
        );

        const result = await res.json();

        if (!cancelled && result.success) {
          setData(result.data);
        }
      } catch {
        if (!cancelled) {
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
  }, [
    canLoad,
    academicYearId,
    classId,
    sectionId,
  ]);

  return {
    loading: canLoad ? loading : false,
    data: canLoad ? data : [],
  };
}