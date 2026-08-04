"use client";

import { useEffect, useState } from "react";

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

  async function load() {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (search) {
        params.set("search", search);
      }

      const res = await fetch(
        `/api/v1/subjects?${params}`
      );

      const result = await res.json();

      if (!result.success) return;

      const data: Response = result.data;

      setSubjects(data.data);

      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [page, search]);

  return {
    subjects,
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