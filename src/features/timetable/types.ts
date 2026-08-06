import { WeekDay } from "@/generated/prisma/client";

export type TimetableGridItem = {
  id: string;

  day: WeekDay;

  period: {
    id: string;
    name: string;
    displayOrder: number;
    startTime: string;
    endTime: string;
  };

  teacher: {
    id: string;
    fullName: string;
  };

  subject: {
    id: string;
    name: string;
  };

  class: {
    id: string;
    name: string;
  };

  section: {
    id: string;
    name: string;
  };
};