import { StudentStatus } from "@/generated/prisma/browser";

export interface ListQuery {
  page: number;
  pageSize: number;

  search?: string;

  sortBy?: string;

  sortOrder?: "asc" | "desc";

  filters?: Record<string, unknown>;
  status?: StudentStatus;
}

export interface PaginatedResult<T> {
  data: T[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;
}