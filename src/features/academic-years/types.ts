import { AcademicYear } from "@/generated/prisma/client";

export type AcademicYearListItem = Pick<
  AcademicYear,
  | "id"
  | "name"
  | "startDate"
  | "endDate"
  | "active"
>;