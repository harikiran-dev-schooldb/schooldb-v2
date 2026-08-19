"use client";

import { useCallback, useEffect, useState } from "react";

import { TeacherListItem } from "../types";

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

  const load = useCallback(async () => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    if (search.trim()) {
      params.set("search", search.trim());
    }

    try {
      const res = await fetch(
        `/api/v1/teachers?${params.toString()}`,
      );

      const result = await res.json();

      if (!result.success) {
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

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        void load();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [load]);

  return {
    teachers,
    loading,

    search,
    setSearch,

    page,
    setPage,

    total,
    pageSize,

    reload: load,
  };
}