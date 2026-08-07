"use client";

import { useCallback, useEffect, useState } from "react";

import { toast } from "sonner";

type AttendanceSessionResponse = {
  session: any;
  students: any[];
};

export function useAttendanceSession(
  sessionId: string
) {
  const [loading, setLoading] =
    useState(true);

  const [data, setData] =
    useState<AttendanceSessionResponse | null>(
      null
    );

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/v1/attendance/session/${sessionId}`
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
        "Failed to load attendance."
      );
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    loading,
    data,
    reload: load,
  };
}