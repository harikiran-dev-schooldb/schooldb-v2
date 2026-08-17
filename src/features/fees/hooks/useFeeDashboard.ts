"use client";

import { useCallback, useEffect, useState } from "react";

import type { FeeDashboardData } from "../types/fee-dashboard.types";

export function useFeeDashboard(academicYearId?: string) {
  const [data, setData] =
    useState<FeeDashboardData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      if (academicYearId) {
        params.set(
          "academicYearId",
          academicYearId,
        );
      }

      const query = params.toString();

      const response = await fetch(
        `/api/v1/fees/dashboard${
          query ? `?${query}` : ""
        }`,
      );

      const result = await response.json();

      if (!result.success) {
        setError(
          result.message ||
            "Failed to load fee dashboard.",
        );

        return;
      }

      setData(result.data);
    } catch {
      setError(
        "Failed to load fee dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, [academicYearId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return {
    data,
    loading,
    error,
    reload: loadDashboard,
  };
}