"use client";

import { useCallback, useEffect, useState } from "react";

import { useDebounce } from "@/hooks/useDebounce";

import { subscribeTableRefresh } from "@/lib/table-event";

import { AcademicYearListItem } from "../types";

type AcademicYearResponse = {
  data: AcademicYearListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function useAcademicYearTable() {
  const [academicYears, setAcademicYears] = useState<AcademicYearListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [reloadVersion, setReloadVersion] = useState(0);

  const debouncedSearch = useDebounce(search);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch(
          `/api/v1/academic-years?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(debouncedSearch)}`,
        );

        const result = await res.json();
        const response: AcademicYearResponse = result.data;

        if (!active) return;

        setAcademicYears(response.data);
        setTotal(response.total);
        setTotalPages(response.totalPages);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [page, pageSize, debouncedSearch, reloadVersion]);

  useEffect(() => {
    return subscribeTableRefresh("academic-years", reload);
  }, [reload]);

  return {
    academicYears,
    loading,
    page,
    setPage,
    pageSize,
    total,
    totalPages,
    search,
    setSearch,
    reload,
  };
}
