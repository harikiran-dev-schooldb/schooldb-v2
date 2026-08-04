import { SubjectType } from "@/generated/prisma/client";

export type SubjectListItem = {
  id: string;

  name: string;

  code: string | null;

  type: SubjectType;

  displayOrder: number;

  active: boolean;
};

export type SubjectOption = {
  id: string;

  label: string;
};