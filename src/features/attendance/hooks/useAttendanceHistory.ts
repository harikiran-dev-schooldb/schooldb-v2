"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { toast } from "sonner";

export type AttendanceHistoryItem = {
  id: string;

  attendanceDate: string;

  sessionType:
    | "DAILY"
    | "MORNING"
    | "AFTERNOON"
    | "PERIOD";

  academicYearName: string;

  className: string;

  sectionName: string;

  teacherName: string | null;

  subjectName: string | null;

  periodName: string | null;

  totalStudents: number;

  present: number;

  absent: number;

  late: number;

  leave: number;

  completed: boolean;
};

type ResponseData = {
  data: AttendanceHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function useAttendanceHistory(
  filters: {
    academicYearId?: string;
    classId?: string;
    sectionId?: string;
    date?: string;
  }
) {
  const [data, setData] =
    useState<ResponseData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const load = useCallback(
    async () => {
      try {
        setLoading(true);

        const params =
          new URLSearchParams();

        params.set("page", "1");
        params.set("pageSize", "50");

        if (filters.academicYearId) {
          params.set(
            "academicYearId",
            filters.academicYearId
          );
        }

        if (filters.classId) {
          params.set(
            "classId",
            filters.classId
          );
        }

        if (filters.sectionId) {
          params.set(
            "sectionId",
            filters.sectionId
          );
        }

        if (filters.date) {
          params.set(
            "date",
            filters.date
          );
        }

        const response = await fetch(
          `/api/v1/attendance/history?${params}`
        );

        const result =
          await response.json();

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        setData(result.data);
      } catch {
        toast.error(
          "Failed to load attendance history."
        );
      } finally {
        setLoading(false);
      }
    },
    [
      filters.academicYearId,
      filters.classId,
      filters.sectionId,
      filters.date,
    ]
  );

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    loading,
    reload: load,
  };
}