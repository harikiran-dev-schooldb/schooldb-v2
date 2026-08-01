"use client";

import { useCallback, useEffect, useState } from "react";

import { StudentListItem } from "../types";

type StudentResponse = {
  data: StudentListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function useStudentTable() {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [search, setSearch] = useState("");

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const reload = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetch(
        `/api/v1/students?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`
      );

      const result = await res.json();

      const response: StudentResponse = result.data;

      setStudents(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    students,
    loading,

    page,
    setPage,

    pageSize,

    search,
    setSearch,

    total,
    totalPages,

    reload,
  };
}