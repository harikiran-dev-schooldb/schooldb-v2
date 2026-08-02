import { classRepository } from "../repositories/class.repository";

import { ListQuery } from "@/types/query";
import { ClassFormOutput } from "../schemas/class.schema";

export const classService = {
  async list(
    schoolId: string,
    query: ListQuery
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const where = {
      schoolId,
      active: true,

      ...(query.search && {
        name: {
          contains: query.search,
          mode: "insensitive" as const,
        },
      }),
    };

    const [data, total] = await Promise.all([
  classRepository.list(where, {
    skip: (page - 1) * pageSize,
    take: pageSize,
  }),
  classRepository.count(where),
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
    input: ClassFormOutput
  ) {
    const exists = await classRepository.findByName(
      input.name,
      schoolId
    );

    if (exists) {
      throw new Error("Class already exists.");
    }

    return classRepository.create({
      name: input.name,
      code: input.code,
      description: input.description,
      displayOrder: input.displayOrder,

      school: {
        connect: {
          id: schoolId,
        },
      },
    });
  },

  async get(id: string, schoolId: string) {
    const item = await classRepository.findById(
      id,
      schoolId
    );

    if (!item) {
      throw new Error("Class not found.");
    }

    return item;
  },

  async update(
  id: string,
  schoolId: string,
  input: ClassFormOutput
) {
  const item = await classRepository.findById(
    id,
    schoolId
  );

  if (!item) {
    throw new Error("Class not found.");
  }

  const duplicate = await classRepository.findByName(
    input.name,
    schoolId
  );

  if (duplicate && duplicate.id !== id) {
    throw new Error("Class already exists.");
  }

  return classRepository.update(
    id,
    schoolId,
    {
      name: input.name,
      code: input.code,
      description: input.description,
      displayOrder: input.displayOrder,
    }
  );
}
};