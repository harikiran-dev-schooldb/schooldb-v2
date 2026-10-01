"use client";

import { useCallback, useEffect, useState } from "react";

import { useDebounce } from "@/hooks/useDebounce";
import { subscribeTableRefresh } from "@/lib/table-event";

import type { HomeworkListItem } from "../types";

type Response = { data: HomeworkListItem[]; total: number };

export function useHomeworkTable() {
  const [data, setData] = useState<HomeworkListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [syllabusId, setSyllabusId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [total, setTotal] = useState(0);
  const [version, setVersion] = useState(0);
  const debouncedSearch = useDebounce(search);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: "1", pageSize: "100" });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (syllabusId) params.set("syllabusId", syllabusId);
    if (branchId) params.set("branchId", branchId);

    void fetch(`/api/v1/homework?${params.toString()}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        if (!active || !result.success) return;
        const response = result.data as Response;
        setData(response.data);
        setTotal(response.total);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [debouncedSearch, syllabusId, branchId, version]);

  useEffect(() => subscribeTableRefresh("homework", reload), [reload]);

  return {
    data,
    loading,
    search,
    setSearch,
    syllabusId,
    setSyllabusId: (value: string) => {
      setSyllabusId(value);
      setBranchId("");
    },
    branchId,
    setBranchId,
    total,
    reload,
  };
}
