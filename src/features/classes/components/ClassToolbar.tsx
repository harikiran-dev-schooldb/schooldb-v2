"use client";

import { CrudToolbar } from "@/components/common/crud/CrudToolbar";
import { AddClassButton } from "./AddClassButton";

type Props = {
  search: string;
  onSearch: (value: string) => void;
};

export function ClassToolbar({ search, onSearch }: Props) {
  return (
    <CrudToolbar
      search={search}
      onSearch={onSearch}
      placeholder="Search classes..."
    ></CrudToolbar>
  );
}
