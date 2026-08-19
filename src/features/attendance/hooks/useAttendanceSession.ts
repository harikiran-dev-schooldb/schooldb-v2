"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type AttendanceSessionData = {
  id: string;
  attendanceDate: string;
  locked: boolean;

  class: {
    id: string;
    name: string;
  };

  section: {
    id: string;
    name: string;
  };

  subject: {
    id: string;
    name: string;
  } | null;

  teacher: {
    id: string;
    fullName: string;
  } | null;

  period: {
    id: string;
    name: string;
  } | null;
};

type StudentAttendance = {
  studentId: string;
  rollNo: number;
  admissionNo: string;
  fullName: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
  remarks?: string;
};

type AttendanceSessionResponse = {
  session: AttendanceSessionData;
  students: StudentAttendance[];
};

export function useAttendanceSession(sessionId: string) {
  const [loading, setLoading] = useState(true);

  const [data, setData] =
    useState<AttendanceSessionResponse | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `/api/v1/attendance/session/${sessionId}`,
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to load attendance.");
        return;
      }

      setData(result.data);
    } catch {
      toast.error("Failed to load attendance.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [load, sessionId]);

  return {
    loading,
    data,
    reload: load,
  };
}