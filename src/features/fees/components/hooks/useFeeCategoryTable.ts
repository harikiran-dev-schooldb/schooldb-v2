"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useDebounce } from "@/hooks/useDebounce";
import { FeeCategoryListItem } from "../../types";



export function useFeeCategoryTable() {
  const [
    feeCategories,
    setFeeCategories,
  ] = useState<
    FeeCategoryListItem[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [
    reloadVersion,
    setReloadVersion,
  ] = useState(0);

  const debouncedSearch =
    useDebounce(search);

  const reload = useCallback(() => {
    setLoading(true);

    setReloadVersion(
      (value) => value + 1,
    );
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch(
          "/api/v1/fee-categories",
        );

        const result =
          await response.json();

        if (!active) return;

        if (!result.success) {
          setFeeCategories([]);
          return;
        }

        let data =
          result.data as FeeCategoryListItem[];

        if (debouncedSearch) {
          const query =
            debouncedSearch.toLowerCase();

          data = data.filter(
            (item) =>
              item.name
                .toLowerCase()
                .includes(query) ||
              item.code
                ?.toLowerCase()
                .includes(query),
          );
        }

        setFeeCategories(data);
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
  }, [debouncedSearch, reloadVersion]);

  return {
    feeCategories,
    loading,
    search,
    setSearch,
    reload,
  };
}