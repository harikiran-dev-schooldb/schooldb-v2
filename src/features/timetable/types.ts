import { WeekDay } from "@/generated/prisma/client";

/* ===========================
   CRUD TABLE
=========================== */

export type TimetableListItem = {
  id: string;

  day: WeekDay;

  active: boolean;

  academicYear: {
    id: string;
    name: string;
  };

  period: {
    id: string;
    name: string;
  };

  teacherAllocation: {
    teacher: {
      fullName: string;
    };

    subject: {
      name: string;
    };

    class: {
      name: string;
    };

    section: {
      name: string;
    };
  };
};

/* ===========================
   GRID VIEW
=========================== */

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