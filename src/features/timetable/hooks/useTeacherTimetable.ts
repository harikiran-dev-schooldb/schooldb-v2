"use client";

import { useEffect, useState } from "react";

import { TimetableGridItem } from "../types";

export function useTeacherTimetable(
  academicYearId?: string,
  teacherId?: string
) {
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState<TimetableGridItem[]>([]);

  const canLoad = Boolean(
    academicYearId && teacherId
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
          teacherId: teacherId!,
        });

        const res = await fetch(
          `/api/v1/timetables/views/teacher?${params.toString()}`
        );

        const result = await res.json();

        if (!cancelled) {
          if (result.success) {
            setData(result.data);
          } else {
            setData([]);
          }
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
    teacherId,
  ]);

  return {
    loading: canLoad ? loading : false,
    data: canLoad ? data : [],
  };
}