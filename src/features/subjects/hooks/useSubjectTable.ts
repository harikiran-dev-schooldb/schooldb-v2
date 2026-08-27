"use client";

import { useCallback, useEffect, useState } from "react";

import { subscribeTableRefresh } from "@/lib/table-event";

import { SubjectListItem } from "../types";

type Response = {
  data: SubjectListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const DEFAULT_PAGE_SIZE = 25;

export function useSubjectTable() {
  const [subjects, setSubjects] = useState<SubjectListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      const trimmedSearch = search.trim();

      if (trimmedSearch) {
        params.set("search", trimmedSearch);
      }

      const response = await fetch(
        `/api/v1/subjects?${params.toString()}`,
        {
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setSubjects([]);
        setTotal(0);
        setTotalPages(0);
        return;
      }

      const data: Response = result.data;

      setSubjects(data.data ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch {
      setSubjects([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [load]);

  const reload = useCallback(async () => {
    await load();
  }, [load]);

  useEffect(() => {
    return subscribeTableRefresh("subjects", reload);
  }, [reload]);

  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function changePageSize(value: number) {
    setPageSize(value);
    setPage(1);
  }

  return {
    subjects,
    loading,

    search,
    setSearch: changeSearch,

    page,
    setPage,

    pageSize,
    setPageSize: changePageSize,

    total,
    totalPages,

    reload,
  };
}