import { academicYearRepository } from "../repositories/academic-year.repository";
import {
  AcademicYearFormOutput,
} from "../schemas/academic-year.schema";

import { ListQuery } from "@/types/query";

export const academicYearService = {
  async list(
    schoolId: string,
    query: ListQuery
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const where = {
      schoolId,

      ...(query.search && {
        name: {
          contains: query.search,
          mode: "insensitive" as const,
        },
      }),
    };

    const [data, total] = await Promise.all([
      academicYearRepository.list(where, {
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      academicYearRepository.count(where),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  async options(schoolId: string) {
  const years = await academicYearRepository.options(schoolId);

  return years.map((item) => ({
    id: item.id,
    label: item.name,
    attendanceMode: item.attendanceMode,
  }));
},

  async create(
    schoolId: string,
    input: AcademicYearFormOutput
  ) {
    const exists =
      await academicYearRepository.findByName(
        schoolId,
        input.name
      );

    if (exists) {
      throw new Error(
        "Academic year already exists."
      );
    }

    return academicYearRepository.create({
      name: input.name,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      attendanceMode:input.attendanceMode,
      active: false,

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
    const year =
      await academicYearRepository.findById(
        id,
        schoolId
      );

    if (!year) {
      throw new Error(
        "Academic year not found."
      );
    }

    return year;
  },

  async update(
    id: string,
    schoolId: string,
    input: AcademicYearFormOutput
  ) {
    const year =
      await academicYearRepository.findById(
        id,
        schoolId
      );

    if (!year) {
      throw new Error(
        "Academic year not found."
      );
    }

    const duplicate =
      await academicYearRepository.findByName(
        schoolId,
        input.name
      );

    if (duplicate && duplicate.id !== id) {
      throw new Error(
        "Academic year already exists."
      );
    }

    return academicYearRepository.update(id, {
      name: input.name,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      attendanceMode: input.attendanceMode
    });
  },

  async activate(
    id: string,
    schoolId: string
  ) {
    const year =
      await academicYearRepository.findById(
        id,
        schoolId
      );

    if (!year) {
      throw new Error(
        "Academic year not found."
      );
    }

    return academicYearRepository.activate(id, schoolId);
  },
};
