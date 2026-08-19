"use client";

import { useCallback, useEffect, useState } from "react";

import { TeacherAllocationListItem } from "../types";

type Response = {
  data: TeacherAllocationListItem[];
  total: number;
};

export function useTeacherAllocationTable() {
  const [allocations, setAllocations] =
    useState<TeacherAllocationListItem[]>([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const queryString = params.toString();

      try {
        const res = await fetch(
          `/api/v1/teacher-allocations${
            queryString ? `?${queryString}` : ""
          }`,
          { signal },
        );

        if (!res.ok) {
          throw new Error("Failed to load teacher allocations");
        }

        const result = await res.json();

        if (signal?.aborted) return;

        if (!result.success) {
          setAllocations([]);
          return;
        }

        const data: Response = result.data;

        setAllocations(data.data);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        if (!signal?.aborted) {
          setAllocations([]);
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [search],
  );

  useEffect(() => {
    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      void load(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [load]);

  const reload = useCallback(() => {
    setLoading(true);
    return load();
  }, [load]);

  return {
    allocations,
    loading,

    search,
    setSearch,

    reload,
  };
}