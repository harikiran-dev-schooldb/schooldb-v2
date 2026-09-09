"use client";

import { useCallback, useEffect, useState } from "react";

import { useDebounce } from "@/hooks/useDebounce";

import { StudentEnrollmentListItem } from "../types";
import { subscribeTableRefresh } from "@/lib/table-event";

type Response = {
  data: StudentEnrollmentListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function useStudentEnrollmentTable() {
  const [enrollments, setEnrollments] = useState<StudentEnrollmentListItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [totalPages, setTotalPages] = useState(1);

  const debouncedSearch = useDebounce(search, 400);

  const [reloadVersion, setReloadVersion] = useState(0);

  const reload = useCallback(() => {
    setReloadVersion((v) => v + 1);
  }, []);

  const handleClassChange = (value: string) => {
    setClassId(value);
    setSectionId("");
    setPage(1);
  };

  const handleSectionChange = (value: string) => {
    setSectionId(value);
    setPage(1);
  };

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          search: debouncedSearch,
        });
        if (classId) params.set("classId", classId);
        if (sectionId) params.set("sectionId", sectionId);

        const res = await fetch(
          `/api/v1/student-enrollments?${params.toString()}`,
        );

        const result = await res.json();

        const response: Response = result.data;

        if (!active) return;

        setEnrollments(response.data);
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
  }, [page, pageSize, debouncedSearch, classId, sectionId, reloadVersion]);

  useEffect(() => {
    return subscribeTableRefresh("enrollments", reload);
  }, [reload]);

  return {
    enrollments,
    loading,

    page,
    setPage,

    totalPages,

    search,
    setSearch,

    classId,
    setClassId: handleClassChange,
    sectionId,
    setSectionId: handleSectionChange,

    reload,
  };
}
