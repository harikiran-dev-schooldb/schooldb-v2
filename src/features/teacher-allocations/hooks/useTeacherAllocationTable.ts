"use client";

import { useEffect, useState } from "react";

import { TeacherAllocationListItem } from "../types";

type Response = {
  data: TeacherAllocationListItem[];
  total: number;
};

export function useTeacherAllocationTable() {
  const [allocations, setAllocations] =
    useState<TeacherAllocationListItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  async function load() {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/v1/teacher-allocations?search=${search}`
      );

      const result = await res.json();

      if (!result.success) return;

      const data: Response = result.data;

      setAllocations(data.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [search]);

  return {
    allocations,

    loading,

    search,
    setSearch,

    reload: load,
  };
}