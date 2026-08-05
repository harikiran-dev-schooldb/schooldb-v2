import { ListQuery } from "@/types/query";

export function getPagination(
  query: ListQuery
) {
  const page = query.page ?? 1;

  const pageSize =
    query.pageSize ?? 25;

  return {
    page,

    pageSize,

    skip:
      (page - 1) * pageSize,

    take: pageSize,
  };
}