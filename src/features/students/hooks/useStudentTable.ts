"use client";

import { useCallback, useEffect, useState } from "react";

import { StudentListItem } from "../types";
import { useDebounce } from "@/hooks/useDebounce";
import { StudentStatus } from "@/generated/prisma/enums";
import { subscribeTableRefresh } from "@/lib/table-event";

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
  const [pageSize] = useState(25);

  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [reloadVersion, setReloadVersion] = useState(0);
  const debouncedSearch = useDebounce(search, 400);
  const [status, setStatus] = useState<StudentStatus>(
  StudentStatus.ACTIVE
);

  const handleSearch = (value: string) => {
    setLoading(true);
    setSearch(value);
    setPage(1);
  };

  const reload = useCallback(() => {
    setLoading(true);
    setReloadVersion((version) => version + 1);
  }, []);

  const handlePageChange = (nextPage: number) => {
    setLoading(true);
    setPage(nextPage);
  };

  const handleStatus = (value: StudentStatus) => {
    setLoading(true);
    setStatus(value);
    setPage(1);
  };

  const handleClass = (value: string) => {
    setLoading(true);
    setClassId(value);
    setSectionId("");
    setPage(1);
  };

  const handleSection = (value: string) => {
    setLoading(true);
    setSectionId(value);
    setPage(1);
  };

  useEffect(() => {
    let active = true;

    async function loadStudents() {
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          search: debouncedSearch,
          status,
        });
        if (classId) params.set("classId", classId);
        if (sectionId) params.set("sectionId", sectionId);

        const res = await fetch(`/api/v1/students?${params.toString()}`);
        const result = await res.json();
        const response: StudentResponse = result.data;

        if (active) {
          setStudents(response.data);
          setTotal(response.total);
          setTotalPages(response.totalPages);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadStudents();
    return () => {
      active = false;
    };
  }, [page, pageSize, debouncedSearch, status, classId, sectionId, reloadVersion]);

  useEffect(() => {
      return subscribeTableRefresh("students", reload);
    }, [reload]);

  return {
    students,
    loading,

    page,
    setPage: handlePageChange,

    pageSize,

    search,
    setSearch: handleSearch,

    total,
    totalPages,

    reload,

    status,
    setStatus: handleStatus,

    classId,
    setClassId: handleClass,
    sectionId,
    setSectionId: handleSection,
  };
}
