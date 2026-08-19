"use client";

import { useCallback, useEffect, useState } from "react";

import { SubjectListItem } from "../types";

type Response = {
  data: SubjectListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function useSubjectTable() {
  const [subjects, setSubjects] = useState<SubjectListItem[]>([]);
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

    const trimmedSearch = search.trim();

    if (trimmedSearch) {
      params.set("search", trimmedSearch);
    }

    try {
      const res = await fetch(
        `/api/v1/subjects?${params.toString()}`,
      );

      const result = await res.json();

      if (!result.success) {
        setSubjects([]);
        setTotal(0);
        return;
      }

      const data: Response = result.data;

      setSubjects(data.data);
      setTotal(data.total);
    } catch {
      setSubjects([]);
      setTotal(0);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load().finally(() => {
        setLoading(false);
      });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [load]);

  const reload = useCallback(async () => {
    setLoading(true);

    try {
      await load();
    } finally {
      setLoading(false);
    }
  }, [load]);

  return {
    subjects,
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