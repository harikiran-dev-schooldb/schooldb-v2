"use client";

import { useCrudTable } from "@/hooks/useCrudTable";

import { HomeworkListItem } from "../types";

export function useHomeworkTable() {
  return useCrudTable<HomeworkListItem>({
    endpoint: "/api/v1/homework",
  });
}