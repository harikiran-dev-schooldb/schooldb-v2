"use client";

import { CrudToolbar } from "@/components/common/crud";

import { AddTimetableButton } from "./AddTimetableButton";

type Props = {
  search: string;
  onSearch: (value: string) => void;
};

export function TimetableToolbar({ search, onSearch }: Props) {
  return (
    <CrudToolbar
      search={search}
      onSearch={onSearch}
      placeholder="Search timetable..."
    >
      <AddTimetableButton />
    </CrudToolbar>
  );
}
