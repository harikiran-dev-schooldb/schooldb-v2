"use client";

import { CrudToolbar } from "@/components/common/crud";

type Props = {
  search: string;
  onSearch: (value: string) => void;
};

export function SectionToolbar({ search, onSearch }: Props) {
  return (
    <CrudToolbar
      search={search}
      onSearch={onSearch}
      placeholder="Search sections..."
    />
  );
}
