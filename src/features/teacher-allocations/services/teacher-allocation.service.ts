import { ListQuery } from "@/types/query";

import {
  TeacherAllocationFormOutput,
} from "../schemas/teacher-allocation.schema";

import { teacherAllocationRepository } from "../repositories/teacher-allocation.repository";
import { academicYearRepository } from "@/features/academic-years/repositories/academic-year.repository";
import { classRepository } from "@/features/classes/repositories/class.repository";
import { sectionRepository } from "@/features/sections/repositories/section.repository";
import { subjectRepository } from "@/features/subjects/repositories/subject.repository";
import { teacherRepository } from "@/features/teachers/repositories/teacher.repository";

async function validateAllocationRelations(
  schoolId: string,
  input: TeacherAllocationFormOutput,
) {
  const [academicYear, teacher, subject, cls, section] = await Promise.all([
    academicYearRepository.findById(input.academicYearId, schoolId),
    teacherRepository.findById(input.teacherId, schoolId),
    subjectRepository.findById(input.subjectId, schoolId),
    classRepository.findById(input.classId, schoolId),
    sectionRepository.findById(input.sectionId, schoolId),
  ]);

  if (!academicYear) throw new Error("Academic year not found.");
  if (!teacher) throw new Error("Teacher not found.");
  if (!subject) throw new Error("Subject not found.");
  if (!cls) throw new Error("Class not found.");
  if (!section || section.classId !== input.classId) {
    throw new Error("Selected section does not belong to the selected class.");
  }
}

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

    await validateAllocationRelations(schoolId, input);

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

    await validateAllocationRelations(schoolId, input);

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
