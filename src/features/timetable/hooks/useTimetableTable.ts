"use client";


import { useCrudTable } from "@/hooks/useCrudTable";
import { TimetableListItem } from "../types";

export function useTimetableTable() {
  return useCrudTable<TimetableListItem>({
    endpoint: "/api/v1/timetables",
  });
}