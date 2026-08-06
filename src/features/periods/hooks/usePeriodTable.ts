"use client";



import { useCrudTable } from "@/hooks/useCrudTable";
import { PeriodListItem } from "../types";

export function usePeriodTable() {
  return useCrudTable<PeriodListItem>({
    endpoint: "/api/v1/periods",
  });
}