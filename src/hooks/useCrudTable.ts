"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { api } from "@/lib/api-client";

import { useDebounce } from "./useDebounce";

import { PaginatedResponse } from "@/types/pagination";

type Props = {
  endpoint: string;

  initialPageSize?: number;
};

export function useCrudTable<T>({
  endpoint,
  initialPageSize = 25,
}: Props) {
  const [data, setData] =
    useState<T[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [page, setPage] =
    useState(1);

  const debouncedSearch =
    useDebounce(search);

  const [total, setTotal] =
    useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const params =
        new URLSearchParams({
          page: page.toString(),
          pageSize:
            initialPageSize.toString(),
        });

      if (debouncedSearch) {
        params.set(
          "search",
          debouncedSearch
        );
      }

      const result =
        await api.get<
          PaginatedResponse<T>
        >(
          `${endpoint}?${params.toString()}`
        );

      setData(result.data);

      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [
    endpoint,
    page,
    initialPageSize,
    debouncedSearch,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,

    loading,

    search,
    setSearch,

    page,
    setPage,

    total,

    reload: load,
  };
}