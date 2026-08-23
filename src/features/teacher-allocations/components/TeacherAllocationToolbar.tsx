"use client";

import { CrudToolbar } from "@/components/common/crud";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  onSuccess?: () => void;
};

export function TeacherAllocationToolbar({
  search,
  onSearchChange,
  onSuccess,
}: Props) {
  return (
    <CrudToolbar
      search={search}
      onSearch={onSearchChange}
      placeholder="Search teacher, subject, class or section..."
    />
  );
}
