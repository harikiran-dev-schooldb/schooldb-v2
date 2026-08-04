import { teacherRepository } from "../repositories/teacher.repository";
import {
  TeacherFormOutput,
} from "../schemas/teacher.schema";

import { ListQuery } from "@/types/query";

export const teacherService = {
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
            employeeId: {
              contains: query.search,
              mode: "insensitive" as const,
            },
          },
          {
            fullName: {
              contains: query.search,
              mode: "insensitive" as const,
            },
          },
          {
            phone: {
              contains: query.search,
              mode: "insensitive" as const,
            },
          },
          {
            email: {
              contains: query.search,
              mode: "insensitive" as const,
            },
          },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      teacherRepository.list(where, {
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),

      teacherRepository.count(where),
    ]);

    return {
      data,

      total,

      page,

      pageSize,

      totalPages: Math.ceil(total / pageSize),
    };
  },

  async create(
    schoolId: string,
    input: TeacherFormOutput
  ) {
    const exists =
      await teacherRepository.findByEmployeeId(
        schoolId,
        input.employeeId
      );

    if (exists) {
      throw new Error(
        "Employee ID already exists."
      );
    }

    return teacherRepository.create({
      employeeId: input.employeeId,

      fullName: input.fullName,

      gender: input.gender,

      dob: input.dob
        ? new Date(input.dob)
        : null,

      joiningDate: input.joiningDate
        ? new Date(input.joiningDate)
        : null,

      phone:
        input.phone === ""
          ? null
          : input.phone,

      email:
        input.email === ""
          ? null
          : input.email,

      qualification:
        input.qualification === ""
          ? null
          : input.qualification,

      designation:
        input.designation === ""
          ? null
          : input.designation,

      active: input.active,

      school: {
        connect: {
          id: schoolId,
        },
      },
    });
  },

  async get(
    id: string,
    schoolId: string
  ) {
    const teacher =
      await teacherRepository.findById(
        id,
        schoolId
      );

    if (!teacher) {
      throw new Error(
        "Teacher not found."
      );
    }

    return teacher;
  },

  async update(
    id: string,
    schoolId: string,
    input: TeacherFormOutput
  ) {
    const teacher =
      await teacherRepository.findById(
        id,
        schoolId
      );

    if (!teacher) {
      throw new Error(
        "Teacher not found."
      );
    }

    const duplicate =
      await teacherRepository.findByEmployeeId(
        schoolId,
        input.employeeId
      );

    if (
      duplicate &&
      duplicate.id !== id
    ) {
      throw new Error(
        "Employee ID already exists."
      );
    }

    return teacherRepository.update(
      id,
      schoolId,
      {
        employeeId: input.employeeId,

        fullName: input.fullName,

        gender: input.gender,

        dob: input.dob
          ? new Date(input.dob)
          : null,

        joiningDate: input.joiningDate
          ? new Date(input.joiningDate)
          : null,

        phone:
          input.phone === ""
            ? null
            : input.phone,

        email:
          input.email === ""
            ? null
            : input.email,

        qualification:
          input.qualification === ""
            ? null
            : input.qualification,

        designation:
          input.designation === ""
            ? null
            : input.designation,

        active: input.active,
      }
    );
  },

  async options(
    schoolId: string
  ) {
    const teachers =
      await teacherRepository.options(
        schoolId
      );

    return teachers.map((teacher) => ({
      id: teacher.id,

      label: `${teacher.employeeId} - ${teacher.fullName}`,
    }));
  },
};