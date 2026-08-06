"use client";

import { CrudToolbar } from "@/components/common/crud";

import { AddPeriodButton } from "./AddPeriodButton";

type Props = {
  search: string;
  onSearch: (value: string) => void;
};

export function PeriodToolbar({ search, onSearch }: Props) {
  return (
    <CrudToolbar
      search={search}
      onSearch={onSearch}
      placeholder="Search periods..."
    >
      <AddPeriodButton />
    </CrudToolbar>
  );
}
