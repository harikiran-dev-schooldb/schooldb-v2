"use client";

import { TeacherListItem } from "@/features/teachers/types";
import { useEffect, useState } from "react";



type Response = {
  data: TeacherListItem[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;
};

export function useTeacherTable() {
  const [teachers, setTeachers] =
    useState<TeacherListItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [pageSize] =
    useState(25);

  const [total, setTotal] =
    useState(0);

  async function load() {
    try {
      setLoading(true);

      const params =
        new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
        });

      if (search) {
        params.set(
          "search",
          search
        );
      }

      const res = await fetch(
        `/api/v1/teachers?${params}`
      );

      const result = await res.json();

      if (!result.success) return;

      const data: Response =
        result.data;

      setTeachers(data.data);

      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [page, search]);

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