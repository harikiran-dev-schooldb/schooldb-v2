import { ColumnDef } from "@tanstack/react-table";
import { StudentListItem } from "./types/student";

export const studentColumns: ColumnDef<StudentListItem>[] = [
  {
    accessorKey: "admissionNo",
    header: "Admission No",
  },
  {
    accessorKey: "fullName",
    header: "Student Name",
  },
  {
    accessorKey: "gender",
    header: "Gender",
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
];
