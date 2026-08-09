"use client";

import { CrudToolbar } from "@/components/common/crud";

import { AddHomeworkButton } from "./AddHomeworkButton";

type Props = {
  search: string;
  onSearch: (value: string) => void;
};

export function HomeworkToolbar({ search, onSearch }: Props) {
  return (
    <CrudToolbar
      search={search}
      onSearch={onSearch}
      placeholder="Search homework..."
    >
      <AddHomeworkButton />
    </CrudToolbar>
  );
}
