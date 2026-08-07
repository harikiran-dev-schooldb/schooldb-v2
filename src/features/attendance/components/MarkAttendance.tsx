"use client";

import { CrudToolbar } from "@/components/common/crud";
import { AddTeacherButton } from "./AttendanceTable";

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
