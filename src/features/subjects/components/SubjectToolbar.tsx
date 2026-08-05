"use client";

import { CrudToolbar } from "@/components/common/crud/CrudToolbar";
import { AddSubjectButton } from "./AddSubjectButton";

type Props = {
  search: string;
  onSearch: (value: string) => void;
};

export function SubjectToolbar({ search, onSearch }: Props) {
  return (
    <CrudToolbar
      search={search}
      onSearch={onSearch}
      placeholder="Search subjects..."
    >
      <AddSubjectButton />
    </CrudToolbar>
  );
}
