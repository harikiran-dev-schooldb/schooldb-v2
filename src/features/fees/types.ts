import { FeeCategory } from "@/generated/prisma/client";

export type FeeCategoryListItem = Pick<
  FeeCategory,
  | "id"
  | "name"
  | "code"
  | "description"
  | "active"
>;