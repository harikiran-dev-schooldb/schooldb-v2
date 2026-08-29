"use client";

import { useCallback, useEffect, useState } from "react";

import { useDebounce } from "@/hooks/useDebounce";

import { SectionListItem } from "../types";
import { subscribeTableRefresh } from "@/lib/table-event";


type SectionResponse = {
  data: SectionListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function useSectionTable() {
  const [sections, setSections] = useState<SectionListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  const [search, setSearch] = useState("");

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [reloadVersion, setReloadVersion] = useState(0);

  const debouncedSearch = useDebounce(search, 400);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadVersion((v) => v + 1);
  }, []);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handlePageChange = (page: number) => {
    setPage(page);
  };

  useEffect(() => {
    let active = true;

    async function loadSections() {
      try {
        const res = await fetch(
          `/api/v1/sections?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(
            debouncedSearch
          )}`
        );

        const result = await res.json();

        const response: SectionResponse = result.data;

        if (!active) return;

        setSections(response.data);
        setTotal(response.total);
        setTotalPages(response.totalPages);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSections();

    return () => {
      active = false;
    };
  }, [page, pageSize, debouncedSearch, reloadVersion]);

  useEffect(() => {
      return subscribeTableRefresh("sections", reload);
    }, [reload]);

  return {
    sections,

    loading,

    page,
    setPage: handlePageChange,

    pageSize,

    search,
    setSearch: handleSearch,

    total,
    totalPages,

    reload,
  };
}