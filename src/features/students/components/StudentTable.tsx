"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";
import { studentColumns } from "../columns";
import { StudentListItem } from "../types";

export function StudentTable({ students }: { students: StudentListItem[] }) {
  return <DataGrid columns={studentColumns} data={students} />;
}
