import { Prisma, WeekDay } from "@/generated/prisma/client";

import { timetableRepository } from "../repositories/timetable.repository";
import { TimetableFormOutput } from "../schemas/timetable.schema";

import { teacherAllocationRepository } from "@/features/teacher-allocations/repositories/teacher-allocation.repository";

export const timetableService = {
  async list(
    schoolId: string,
    query: {
      page: number;
      pageSize: number;
      search?: string;
    },
  ) {
    const page = Math.max(1, query.page);
    const pageSize = Math.min(
      100,
      Math.max(1, query.pageSize),
    );

    const skip = (page - 1) * pageSize;

    const where: Prisma.TimetableWhereInput = {
      schoolId,

      ...(query.search?.trim() && {
        OR: [
          {
            teacherAllocation: {
              teacher: {
                fullName: {
                  contains: query.search.trim(),
                  mode: "insensitive",
                },
              },
            },
          },
          {
            teacherAllocation: {
              subject: {
                name: {
                  contains: query.search.trim(),
                  mode: "insensitive",
                },
              },
            },
          },
          {
            teacherAllocation: {
              class: {
                name: {
                  contains: query.search.trim(),
                  mode: "insensitive",
                },
              },
            },
          },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      timetableRepository.list(where, {
        skip,
        take: pageSize,
      }),

      timetableRepository.count(where),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages:
        total > 0
          ? Math.ceil(total / pageSize)
          : 0,
    };
  },

  async get(
    id: string,
    schoolId: string,
  ) {
    const timetable =
      await timetableRepository.get(
        id,
        schoolId,
      );

    if (!timetable) {
      throw new Error(
        "Timetable entry not found.",
      );
    }

    return timetable;
  },

  async create(
    schoolId: string,
    input: TimetableFormOutput,
  ) {
    /*
     * --------------------------------------------------------------
     * Verify teacher allocation
     * --------------------------------------------------------------
     */

    const allocation =
      await teacherAllocationRepository.getForScheduling(
        input.teacherAllocationId,
        schoolId,
      );

    if (!allocation) {
      throw new Error(
        "Teacher allocation not found.",
      );
    }

    if (!allocation.active) {
      throw new Error(
        "Teacher allocation is inactive.",
      );
    }

    /*
     * --------------------------------------------------------------
     * Academic year must match allocation
     * --------------------------------------------------------------
     */

    if (
      allocation.academicYearId !==
      input.academicYearId
    ) {
      throw new Error(
        "Academic year does not match the teacher allocation.",
      );
    }

    /*
     * --------------------------------------------------------------
     * Duplicate allocation / period / day
     * --------------------------------------------------------------
     */

    const duplicate =
      await timetableRepository.findDuplicate(
        schoolId,
        allocation.academicYearId,
        allocation.id,
        input.periodId,
        input.day,
      );

    if (duplicate) {
      throw new Error(
        "Timetable already exists for this teacher allocation, period and day.",
      );
    }

    /*
     * --------------------------------------------------------------
     * Teacher conflict
     * --------------------------------------------------------------
     */

    const teacherConflict =
      await timetableRepository.findTeacherConflict(
        schoolId,
        allocation.teacherId,
        allocation.academicYearId,
        input.periodId,
        input.day,
      );

    if (teacherConflict) {
      throw new Error(
        "Teacher already has another class during this period.",
      );
    }

    /*
     * --------------------------------------------------------------
     * Class / section conflict
     * --------------------------------------------------------------
     */

    const classConflict =
      await timetableRepository.findClassConflict(
        schoolId,
        allocation.classId,
        allocation.sectionId,
        allocation.academicYearId,
        input.periodId,
        input.day,
      );

    if (classConflict) {
      throw new Error(
        "Class already has another subject during this period.",
      );
    }

    /*
     * --------------------------------------------------------------
     * Create
     *
     * Academic year comes from the validated allocation.
     * --------------------------------------------------------------
     */

    return timetableRepository.create({
      school: {
        connect: {
          id: schoolId,
        },
      },

      academicYear: {
        connect: {
          id: allocation.academicYearId,
        },
      },

      teacherAllocation: {
        connect: {
          id: allocation.id,
        },
      },

      period: {
        connect: {
          id: input.periodId,
        },
      },

      day: input.day,

      active: input.active,
    });
  },

  async update(
    id: string,
    schoolId: string,
    input: TimetableFormOutput,
  ) {
    /*
     * --------------------------------------------------------------
     * Verify timetable belongs to school
     * --------------------------------------------------------------
     */

    await this.get(id, schoolId);

    /*
     * --------------------------------------------------------------
     * Verify teacher allocation
     * --------------------------------------------------------------
     */

    const allocation =
      await teacherAllocationRepository.getForScheduling(
        input.teacherAllocationId,
        schoolId,
      );

    if (!allocation) {
      throw new Error(
        "Teacher allocation not found.",
      );
    }

    if (!allocation.active) {
      throw new Error(
        "Teacher allocation is inactive.",
      );
    }

    /*
     * --------------------------------------------------------------
     * Academic year must match allocation
     * --------------------------------------------------------------
     */

    if (
      allocation.academicYearId !==
      input.academicYearId
    ) {
      throw new Error(
        "Academic year does not match the teacher allocation.",
      );
    }

    /*
     * --------------------------------------------------------------
     * Duplicate timetable
     * --------------------------------------------------------------
     */

    const duplicate =
      await timetableRepository.findDuplicate(
        schoolId,
        allocation.academicYearId,
        allocation.id,
        input.periodId,
        input.day,
        id,
      );

    if (duplicate) {
      throw new Error(
        "Timetable already exists for this teacher allocation, period and day.",
      );
    }

    /*
     * --------------------------------------------------------------
     * Teacher conflict
     * --------------------------------------------------------------
     */

    const teacherConflict =
      await timetableRepository.findTeacherConflict(
        schoolId,
        allocation.teacherId,
        allocation.academicYearId,
        input.periodId,
        input.day,
        id,
      );

    if (teacherConflict) {
      throw new Error(
        "Teacher already has another class during this period.",
      );
    }

    /*
     * --------------------------------------------------------------
     * Class / section conflict
     * --------------------------------------------------------------
     */

    const classConflict =
      await timetableRepository.findClassConflict(
        schoolId,
        allocation.classId,
        allocation.sectionId,
        allocation.academicYearId,
        input.periodId,
        input.day,
        id,
      );

    if (classConflict) {
      throw new Error(
        "Class already has another subject during this period.",
      );
    }

    /*
     * --------------------------------------------------------------
     * Update
     * --------------------------------------------------------------
     */

    return timetableRepository.update(
      id,
      schoolId,
      {
        academicYear: {
          connect: {
            id: allocation.academicYearId,
          },
        },

        teacherAllocation: {
          connect: {
            id: allocation.id,
          },
        },

        period: {
          connect: {
            id: input.periodId,
          },
        },

        day: input.day,

        active: input.active,
      },
    );
  },

  async options(
    schoolId: string,
  ) {
    const rows =
      await timetableRepository.options(
        schoolId,
      );

    return rows.map((row) => ({
      id: row.id,
      label: `${row.day} - ${row.period.name}`,
    }));
  },

  async classView(
    schoolId: string,
    academicYearId: string,
    classId: string,
    sectionId: string,
  ) {
    return timetableRepository.getClassTimetable(
      schoolId,
      academicYearId,
      classId,
      sectionId,
    );
  },

  async teacherView(
    schoolId: string,
    academicYearId: string,
    teacherId: string,
  ) {
    return timetableRepository.getTeacherTimetable(
      schoolId,
      academicYearId,
      teacherId,
    );
  },

  async dailyView(
    schoolId: string,
    academicYearId: string,
    day: WeekDay,
  ) {
    return timetableRepository.getDailyTimetable(
      schoolId,
      academicYearId,
      day,
    );
  },
};