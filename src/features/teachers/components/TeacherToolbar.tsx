"use client";

import { CrudToolbar } from "@/components/common/crud/CrudToolbar";
import { AddTeacherButton } from "./AddTeacherButton";

type Props = {
  search: string;
  onSearch: (value: string) => void;
};

export function TeacherToolbar({ search, onSearch }: Props) {
  return (
    <CrudToolbar
      search={search}
      onSearch={onSearch}
      placeholder="Search teachers..."
    >
      <AddTeacherButton />
    </CrudToolbar>
  );
}
