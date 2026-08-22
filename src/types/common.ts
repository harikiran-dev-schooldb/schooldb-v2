export type Option = {
  id: string;
  label: string;
};

export type PaginatedResponse<T> = {
  data: T[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;
};