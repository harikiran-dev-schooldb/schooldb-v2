import { Prisma } from "@/generated/prisma/client";

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
    }
  ) {
    const skip =
      (query.page - 1) * query.pageSize;

    const where: Prisma.TimetableWhereInput = {
      schoolId,

      ...(query.search && {
        OR: [
          {
            teacherAllocation: {
              teacher: {
                fullName: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            teacherAllocation: {
              subject: {
                name: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            teacherAllocation: {
              class: {
                name: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
            },
          },
        ],
      }),
    };

    const [data, total] =
      await Promise.all([
        timetableRepository.list(where, {
          skip,
          take: query.pageSize,
        }),

        timetableRepository.count(where),
      ]);

    return {
      data,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(
        total / query.pageSize
      ),
    };
  },

  async get(
    id: string,
    schoolId: string
  ) {
    const timetable =
      await timetableRepository.get(
        id,
        schoolId
      );

    if (!timetable) {
      throw new Error(
        "Timetable entry not found."
      );
    }

    return timetable;
  },

  async create(
    schoolId: string,
    input: TimetableFormOutput
  ) {
    const allocation =
      await teacherAllocationRepository.getForScheduling(
        input.teacherAllocationId,
        schoolId
      );

    if (!allocation) {
      throw new Error(
        "Teacher allocation not found."
      );
    }

    if (!allocation.active) {
      throw new Error(
        "Teacher allocation is inactive."
      );
    }

    const duplicate =
      await timetableRepository.findDuplicate(
        schoolId,
        allocation.academicYearId,
        allocation.id,
        input.periodId,
        input.day
      );

    if (duplicate) {
      throw new Error(
        "Timetable already exists."
      );
    }

    const teacherConflict =
      await timetableRepository.findTeacherConflict(
        schoolId,
        allocation.teacherId,
        allocation.academicYearId,
        input.periodId,
        input.day
      );

    if (teacherConflict) {
      throw new Error(
        "Teacher already has another class during this period."
      );
    }

    const classConflict =
      await timetableRepository.findClassConflict(
        schoolId,
        allocation.classId,
        allocation.sectionId,
        allocation.academicYearId,
        input.periodId,
        input.day
      );

    if (classConflict) {
      throw new Error(
        "Class already has another subject during this period."
      );
    }

    return timetableRepository.create({
      school: {
        connect: {
          id: schoolId,
        },
      },

      academicYear: {
        connect: {
          id: input.academicYearId,
        },
      },

      teacherAllocation: {
        connect: {
          id: input.teacherAllocationId,
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
    input: TimetableFormOutput
  ) {
    await this.get(id, schoolId);

    const allocation =
      await teacherAllocationRepository.getForScheduling(
        input.teacherAllocationId,
        schoolId
      );

    if (!allocation) {
      throw new Error(
        "Teacher allocation not found."
      );
    }

    if (!allocation.active) {
      throw new Error(
        "Teacher allocation is inactive."
      );
    }

    const duplicate =
      await timetableRepository.findDuplicate(
        schoolId,
        allocation.academicYearId,
        allocation.id,
        input.periodId,
        input.day,
        id
      );

    if (duplicate) {
      throw new Error(
        "Timetable already exists."
      );
    }

    const teacherConflict =
      await timetableRepository.findTeacherConflict(
        schoolId,
        allocation.teacherId,
        allocation.academicYearId,
        input.periodId,
        input.day,
        id
      );

    if (teacherConflict) {
      throw new Error(
        "Teacher already has another class during this period."
      );
    }

    const classConflict =
      await timetableRepository.findClassConflict(
        schoolId,
        allocation.classId,
        allocation.sectionId,
        allocation.academicYearId,
        input.periodId,
        input.day,
        id
      );

    if (classConflict) {
      throw new Error(
        "Class already has another subject during this period."
      );
    }

    return timetableRepository.update(
      id,
      schoolId,
      {
        academicYear: {
          connect: {
            id: input.academicYearId,
          },
        },

        teacherAllocation: {
          connect: {
            id: input.teacherAllocationId,
          },
        },

        period: {
          connect: {
            id: input.periodId,
          },
        },

        day: input.day,

        active: input.active,
      }
    );
  },

  async options(
    schoolId: string
  ) {
    const rows =
      await timetableRepository.options(
        schoolId
      );

    return rows.map((row) => ({
      id: row.id,

      label: `${row.day} - ${row.period.name}`,
    }));
  },
};