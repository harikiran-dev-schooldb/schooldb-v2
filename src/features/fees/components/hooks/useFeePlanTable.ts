"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type FeePlan = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  appliesToAllClasses: boolean;

  academicYear?: {
    id: string;
    name: string;
  };

  classes?: {
    id: string;
    class?: {
      id: string;
      name: string;
    };
  }[];

  items?: {
    id: string;
    frequency: string;
    amount: string;
    mandatory: boolean;
    feeCategory?: {
      id: string;
      name: string;
    };
  }[];
};

export function useFeePlanTable() {
  const [feePlans, setFeePlans] = useState<FeePlan[]>([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const fetchFeePlans = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/v1/fee-plans", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load fee plans.",
        );
      }

      setFeePlans(result.data ?? []);
    } catch (error) {
      console.error("Failed to load fee plans:", error);

      setFeePlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        void fetchFeePlans();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fetchFeePlans]);

  const filteredFeePlans = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return feePlans;
    }

    return feePlans.filter((plan) => {
      return (
        plan.name.toLowerCase().includes(query) ||
        plan.academicYear?.name
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [feePlans, search]);

  return {
    feePlans: filteredFeePlans,
    loading,
    search,
    setSearch,
    reload: fetchFeePlans,
  };
}