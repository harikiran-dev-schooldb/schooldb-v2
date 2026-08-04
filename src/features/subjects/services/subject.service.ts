import { SubjectFormOutput } from "../schemas/subject.schema";
import { subjectRepository } from "../repositories/subject.repository";

import { ListQuery } from "@/types/query";

export const subjectService = {
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
            name: {
              contains: query.search,
              mode: "insensitive" as const,
            },
          },
          {
            code: {
              contains: query.search,
              mode: "insensitive" as const,
            },
          },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      subjectRepository.list(where, {
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),

      subjectRepository.count(where),
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
    input: SubjectFormOutput
  ) {
    const exists =
      await subjectRepository.findByName(
        schoolId,
        input.name
      );

    if (exists) {
      throw new Error(
        "Subject already exists."
      );
    }

    return subjectRepository.create({
      name: input.name,

      code:
        input.code === ""
          ? null
          : input.code,

      type: input.type,

      displayOrder:
        input.displayOrder,

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
    const subject =
      await subjectRepository.findById(
        id,
        schoolId
      );

    if (!subject) {
      throw new Error(
        "Subject not found."
      );
    }

    return subject;
  },

  async update(
    id: string,
    schoolId: string,
    input: SubjectFormOutput
  ) {
    const subject =
      await subjectRepository.findById(
        id,
        schoolId
      );

    if (!subject) {
      throw new Error(
        "Subject not found."
      );
    }

    const duplicate =
      await subjectRepository.findByName(
        schoolId,
        input.name
      );

    if (
      duplicate &&
      duplicate.id !== id
    ) {
      throw new Error(
        "Subject already exists."
      );
    }

    return subjectRepository.update(
      id,
      schoolId,
      {
        name: input.name,

        code:
          input.code === ""
            ? null
            : input.code,

        type: input.type,

        displayOrder:
          input.displayOrder,

        active: input.active,
      }
    );
  },

  async options(
    schoolId: string
  ) {
    const data =
      await subjectRepository.options(
        schoolId
      );

    return data.map((item) => ({
      id: item.id,

      label: item.name,
    }));
  },
};