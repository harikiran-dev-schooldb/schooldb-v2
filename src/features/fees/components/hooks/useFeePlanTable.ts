"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { subscribeTableRefresh } from "@/lib/table-event";

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

  const [academicYearId, setAcademicYearId] = useState("");

  const [classId, setClassId] = useState("");

  const [frequency, setFrequency] = useState("");

  const [status, setStatus] = useState("");

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

  useEffect(() => {
    return subscribeTableRefresh("fee-plans", () => {
      void fetchFeePlans();
    });
  }, [fetchFeePlans]);

  const academicYearOptions = useMemo(() => {
    const options = new Map<string, string>();

    feePlans.forEach((plan) => {
      if (plan.academicYear) {
        options.set(plan.academicYear.id, plan.academicYear.name);
      }
    });

    return Array.from(options, ([id, label]) => ({ id, label }));
  }, [feePlans]);

  const classOptions = useMemo(() => {
    const options = new Map<string, string>();

    feePlans.forEach((plan) => {
      plan.classes?.forEach((item) => {
        if (item.class) {
          options.set(item.class.id, item.class.name);
        }
      });
    });

    return Array.from(options, ([id, label]) => ({ id, label })).sort(
      (a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }),
    );
  }, [feePlans]);

  const filteredFeePlans = useMemo(() => {
    const query = search.trim().toLowerCase();

    return feePlans.filter((plan) => {
      const matchesSearch =
        !query ||
        plan.name.toLowerCase().includes(query) ||
        plan.description?.toLowerCase().includes(query) ||
        plan.classes?.some((item) =>
          item.class?.name.toLowerCase().includes(query),
        ) ||
        plan.items?.some((item) =>
          item.feeCategory?.name.toLowerCase().includes(query),
        );

      const matchesAcademicYear =
        !academicYearId || plan.academicYear?.id === academicYearId;

      const matchesClass =
        !classId ||
        plan.appliesToAllClasses ||
        plan.classes?.some((item) => item.class?.id === classId);

      const matchesFrequency =
        !frequency || plan.items?.some((item) => item.frequency === frequency);

      const matchesStatus =
        !status || (status === "ACTIVE" ? plan.active : !plan.active);

      return (
        matchesSearch &&
        matchesAcademicYear &&
        matchesClass &&
        matchesFrequency &&
        matchesStatus
      );
    });
  }, [academicYearId, classId, feePlans, frequency, search, status]);

  const clearFilters = () => {
    setAcademicYearId("");
    setClassId("");
    setFrequency("");
    setStatus("");
  };

  return {
    feePlans: filteredFeePlans,
    loading,
    search,
    setSearch,
    academicYearId,
    setAcademicYearId,
    academicYearOptions,
    classId,
    setClassId,
    classOptions,
    frequency,
    setFrequency,
    status,
    setStatus,
    clearFilters,
    hasActiveFilters: Boolean(academicYearId || classId || frequency || status),
    reload: fetchFeePlans,
  };
}
