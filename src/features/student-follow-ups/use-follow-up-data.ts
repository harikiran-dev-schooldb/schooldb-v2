"use client";

import { useEffect, useState } from "react";

import { fetchFollowUpData } from "./follow-up-ui";

type LoadResult<T> = { data: T; error?: never } | { error: string; data?: never };

export function useFollowUpData<T>(url: string, revision = 0) {
  const [result, setResult] = useState<{
    url: string;
    revision: number;
    value: LoadResult<T>;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      let value: LoadResult<T>;
      try {
        value = { data: await fetchFollowUpData<T>(url, { signal: controller.signal }) };
      } catch (error) {
        value = { error: error instanceof Error ? error.message : "Unable to load follow-ups." };
      }
      if (!controller.signal.aborted) setResult({ url, revision, value });
    }
    void load();
    return () => controller.abort();
  }, [url, revision]);

  return result?.url === url && result.revision === revision ? result.value : null;
}
