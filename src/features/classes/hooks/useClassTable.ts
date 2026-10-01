"use client";

import { useCallback, useEffect, useState } from "react";

import { useDebounce } from "@/hooks/useDebounce";
import { ClassListItem } from "../types";
import { subscribeTableRefresh } from "@/lib/table-event";


type ClassResponse = {
  data: ClassListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function useClassTable() {
  const [classes, setClasses] = useState<ClassListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  const [search, setSearch] = useState("");
  const [syllabusId, setSyllabusId] = useState("");
  const [branchId, setBranchId] = useState("");

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

  const handlePage = (page: number) => {
    setPage(page);
  };

  const handleSyllabus = (value: string) => {
    setSyllabusId(value);
    setBranchId("");
    setPage(1);
  };

  const handleBranch = (value: string) => {
    setBranchId(value);
    setPage(1);
  };

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          search: debouncedSearch,
        });
        if (syllabusId) params.set("syllabusId", syllabusId);
        if (branchId) params.set("branchId", branchId);

        const res = await fetch(`/api/v1/classes?${params.toString()}`);

        const result = await res.json();

        const response: ClassResponse = result.data;

        if (!active) return;

        setClasses(response.data);
        setTotal(response.total);
        setTotalPages(response.totalPages);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [page, pageSize, debouncedSearch, syllabusId, branchId, reloadVersion]);

  useEffect(() => {
      return subscribeTableRefresh("classes", reload);
    }, [reload]);

  return {
    classes,

    loading,

    page,
    setPage: handlePage,

    pageSize,

    total,
    totalPages,

    search,
    setSearch: handleSearch,

    syllabusId,
    setSyllabusId: handleSyllabus,
    branchId,
    setBranchId: handleBranch,

    reload,
  };
}
