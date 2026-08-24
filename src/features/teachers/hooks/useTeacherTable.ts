"use client";

import { useCallback, useEffect, useState } from "react";

import { TeacherListItem } from "../types";
import { subscribeTableRefresh } from "@/lib/table-event";

type Response = {
  data: TeacherListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function useTeacherTable() {
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);

  /*
   * ------------------------------------------------------------------------
   * Load teachers
   * ------------------------------------------------------------------------
   *
   * This function is kept for manual reloads and table refresh events.
   */

  const reload = useCallback(async () => {
    setLoading(true);

    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    if (search.trim()) {
      params.set("search", search.trim());
    }

    try {
      const res = await fetch(`/api/v1/teachers?${params.toString()}`, {
        cache: "no-store",
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        setTeachers([]);
        setTotal(0);
        return;
      }

      const data: Response = result.data;

      setTeachers(data.data);
      setTotal(data.total);
    } catch {
      setTeachers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  /*
   * ------------------------------------------------------------------------
   * Initial / filter / pagination loading
   * ------------------------------------------------------------------------
   *
   * The fetch is performed directly inside the effect.
   * This avoids react-hooks/set-state-in-effect being triggered by
   * calling a callback that synchronously performs state updates.
   */

  useEffect(() => {
    let cancelled = false;

    async function loadTeachers() {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      try {
        const res = await fetch(`/api/v1/teachers?${params.toString()}`, {
          cache: "no-store",
        });

        const result = await res.json();

        if (cancelled) {
          return;
        }

        if (!res.ok || !result.success) {
          setTeachers([]);
          setTotal(0);
          return;
        }

        const data: Response = result.data;

        setTeachers(data.data);
        setTotal(data.total);
      } catch {
        if (!cancelled) {
          setTeachers([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTeachers();

    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search]);

  /*
   * ------------------------------------------------------------------------
   * External table refresh
   * ------------------------------------------------------------------------
   */

  useEffect(() => {
    return subscribeTableRefresh("teachers", reload);
  }, [reload]);

  return {
    teachers,
    loading,
    search,
    setSearch,
    page,
    setPage,
    total,
    pageSize,
    reload,
  };
}