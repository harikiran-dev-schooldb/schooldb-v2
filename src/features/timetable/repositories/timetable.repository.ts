import {
  Prisma,
  WeekDay,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

const timetableInclude = {
  academicYear: true,

  period: true,

  teacherAllocation: {
    include: {
      teacher: true,
      subject: true,
      class: true,
      section: true,
    },
  },
} satisfies Prisma.TimetableInclude;

export const timetableRepository = {
  list(
    where: Prisma.TimetableWhereInput,
    options?: {
      skip?: number;
      take?: number;
    }
  ) {
    return prisma.timetable.findMany({
      where,

      skip: options?.skip,
      take: options?.take,

      include: timetableInclude,

      orderBy: [
        {
          day: "asc",
        },
        {
          period: {
            displayOrder: "asc",
          },
        },
      ],
    });
  },

  count(
    where: Prisma.TimetableWhereInput
  ) {
    return prisma.timetable.count({
      where,
    });
  },

  get(
    id: string,
    schoolId: string
  ) {
    return prisma.timetable.findFirst({
      where: {
        id,
        schoolId,
      },

      include: timetableInclude,
    });
  },

  create(
    data: Prisma.TimetableCreateInput
  ) {
    return prisma.timetable.create({
      data,

      include: timetableInclude,
    });
  },

  update(
    id: string,
    schoolId: string,
    data: Prisma.TimetableUpdateInput
  ) {
    return prisma.timetable.update({
      where: {
        id,
        schoolId,
      },

      data,

      include: timetableInclude,
    });
  },

  delete(
    id: string,
    schoolId: string
  ) {
    return prisma.timetable.delete({
      where: {
        id,
        schoolId,
      },
    });
  },

    options(schoolId: string) {
    return prisma.timetable.findMany({
      where: {
        schoolId,
        active: true,
      },

      select: {
        id: true,

        day: true,

        period: {
          select: {
            name: true,
          },
        },
      },

      orderBy: [
        {
          day: "asc",
        },
        {
          period: {
            displayOrder: "asc",
          },
        },
      ],
    });
  },

  findDuplicate(
    schoolId: string,
    academicYearId: string,
    teacherAllocationId: string,
    periodId: string,
    day: WeekDay,
    excludeId?: string
  ) {
    return prisma.timetable.findFirst({
      where: {
        schoolId,
        academicYearId,
        teacherAllocationId,
        periodId,
        day,

        ...(excludeId && {
          NOT: {
            id: excludeId,
          },
        }),
      },
    });
  },

  findTeacherConflict(
    schoolId: string,
    teacherId: string,
    academicYearId: string,
    periodId: string,
    day: WeekDay,
    excludeId?: string
  ) {
    return prisma.timetable.findFirst({
      where: {
        schoolId,
        academicYearId,
        periodId,
        day,

        ...(excludeId && {
          NOT: {
            id: excludeId,
          },
        }),

        teacherAllocation: {
          teacherId,
        },
      },

      include: {
        teacherAllocation: {
          include: {
            teacher: true,
            subject: true,
            class: true,
            section: true,
          },
        },

        period: true,
      },
    });
  },

  findClassConflict(
    schoolId: string,
    classId: string,
    sectionId: string,
    academicYearId: string,
    periodId: string,
    day: WeekDay,
    excludeId?: string
  ) {
    return prisma.timetable.findFirst({
      where: {
        schoolId,
        academicYearId,
        periodId,
        day,

        ...(excludeId && {
          NOT: {
            id: excludeId,
          },
        }),

        teacherAllocation: {
          classId,
          sectionId,
        },
      },

      include: {
        teacherAllocation: {
          include: {
            teacher: true,
            subject: true,
            class: true,
            section: true,
          },
        },

        period: true,
      },
    });
  },

  getClassTimetable(
  schoolId: string,
  academicYearId: string,
  classId: string,
  sectionId: string
) {
  return prisma.timetable.findMany({
    where: {
      schoolId,
      academicYearId,

      teacherAllocation: {
        classId,
        sectionId,
      },
    },

    include: timetableInclude,

    orderBy: [
      {
        period: {
          displayOrder: "asc",
        },
      },
      {
        day: "asc",
      },
    ],
  });
},

getTeacherTimetable(
  schoolId: string,
  academicYearId: string,
  teacherId: string
) {
  return prisma.timetable.findMany({
    where: {
      schoolId,
      academicYearId,

      teacherAllocation: {
        teacherId,
      },
    },

    include: timetableInclude,

    orderBy: [
      {
        period: {
          displayOrder: "asc",
        },
      },
      {
        day: "asc",
      },
    ],
  });
},

getDailyTimetable(
  schoolId: string,
  academicYearId: string,
  day: WeekDay
) {
  return prisma.timetable.findMany({
    where: {
      schoolId,
      academicYearId,
      day,
    },

    include: timetableInclude,

    orderBy: [
      {
        period: {
          displayOrder: "asc",
        },
      },
    ],
  });
},

getAttendanceInfo(
  id: string,
  schoolId: string
) {
  return prisma.timetable.findFirst({
    where: {
      id,
      schoolId,
    },

    include: {
      period: true,

      teacherAllocation: {
        include: {
          academicYear: true,
          teacher: true,
          subject: true,
          class: true,
          section: true,
        },
      },
    },
  });
},
};