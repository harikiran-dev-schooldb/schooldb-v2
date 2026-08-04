import { ListQuery } from "@/types/query";

import {
  TeacherAllocationFormOutput,
} from "../schemas/teacher-allocation.schema";

import { teacherAllocationRepository } from "../repositories/teacher-allocation.repository";

export const teacherAllocationService = {
  async list(
    schoolId: string,
    query: ListQuery
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const where = {
      schoolId,

      ...(query.search && {
        OR: [
          {
            teacher: {
              fullName: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
          },

          {
            subject: {
              name: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
          },

          {
            class: {
              name: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
          },

          {
            section: {
              name: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
          },

          {
            academicYear: {
              name: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
          },
        ],
      }),
    };

    const [rows, total] = await Promise.all([
      teacherAllocationRepository.list(where, {
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),

      teacherAllocationRepository.count(where),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,

        academicYearId: row.academicYearId,
        academicYearName: row.academicYear.name,

        teacherId: row.teacherId,
        teacherName: row.teacher.fullName,

        subjectId: row.subjectId,
        subjectName: row.subject.name,

        classId: row.classId,
        className: row.class.name,

        sectionId: row.sectionId,
        sectionName: row.section.name,

        remarks: row.remarks,

        active: row.active,
      })),

      total,

      page,

      pageSize,

      totalPages: Math.ceil(total / pageSize),
    };
  },

  async create(
    schoolId: string,
    input: TeacherAllocationFormOutput
  ) {
    const duplicate =
      await teacherAllocationRepository.findDuplicate(
        schoolId,
        input.academicYearId,
        input.teacherId,
        input.subjectId,
        input.classId,
        input.sectionId
      );

    if (duplicate) {
      throw new Error(
        "Teacher allocation already exists."
      );
    }

    return teacherAllocationRepository.create({
      remarks:
        input.remarks === ""
          ? null
          : input.remarks,

      active: input.active,

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

      teacher: {
        connect: {
          id: input.teacherId,
        },
      },

      subject: {
        connect: {
          id: input.subjectId,
        },
      },

      class: {
        connect: {
          id: input.classId,
        },
      },

      section: {
        connect: {
          id: input.sectionId,
        },
      },
    });
  },

  async get(
    id: string,
    schoolId: string
  ) {
    const allocation =
      await teacherAllocationRepository.findById(
        id,
        schoolId
      );

    if (!allocation) {
      throw new Error(
        "Teacher allocation not found."
      );
    }

    return allocation;
  },

  async update(
    id: string,
    schoolId: string,
    input: TeacherAllocationFormOutput
  ) {
    const allocation =
      await teacherAllocationRepository.findById(
        id,
        schoolId
      );

    if (!allocation) {
      throw new Error(
        "Teacher allocation not found."
      );
    }

    const duplicate =
      await teacherAllocationRepository.findDuplicate(
        schoolId,
        input.academicYearId,
        input.teacherId,
        input.subjectId,
        input.classId,
        input.sectionId
      );

    if (
      duplicate &&
      duplicate.id !== id
    ) {
      throw new Error(
        "Teacher allocation already exists."
      );
    }

    return teacherAllocationRepository.update(
      id,
      schoolId,
      {
        remarks:
          input.remarks === ""
            ? null
            : input.remarks,

        active: input.active,

        academicYear: {
          connect: {
            id: input.academicYearId,
          },
        },

        teacher: {
          connect: {
            id: input.teacherId,
          },
        },

        subject: {
          connect: {
            id: input.subjectId,
          },
        },

        class: {
          connect: {
            id: input.classId,
          },
        },

        section: {
          connect: {
            id: input.sectionId,
          },
        },
      }
    );
  },

  async options(
    schoolId: string
  ) {
    const rows =
      await teacherAllocationRepository.options(
        schoolId
      );

    return rows.map((row) => ({
      id: row.id,

      label: `${row.teacher.fullName} • ${row.subject.name} • ${row.class.name}-${row.section.name}`,
    }));
  },
};