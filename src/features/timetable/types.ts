import { WeekDay } from "@/generated/prisma/client";

export type TimetableListItem = {
  id: string;

  day: WeekDay;

  active: boolean;

  academicYear: string;

  class: string;

  section: string;

  subject: string;

  teacher: string;

  period: string;
};

export type TimetableOption = {
  id: string;
  label: string;
};