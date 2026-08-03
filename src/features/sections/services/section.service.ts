import { Prisma } from "@/generated/prisma/client";

import { sectionRepository } from "../repositories/section.repository";
import { SectionFormOutput } from "../schemas/section.schema";

import { ListQuery } from "@/types/query";

export const sectionService = {
  async list(
    schoolId: string,
    query: ListQuery
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const where: Prisma.SectionWhereInput = {
      active: true,

      class: {
        schoolId,
      },

      ...(query.search && {
        OR: [
          {
            name: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            class: {
              name: {
                contains: query.search,
                mode: "insensitive",
              },
            },
          },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      sectionRepository.list(where, {
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      sectionRepository.count(where),
    ]);

    return {
      data: data.map((section) => ({
        id: section.id,
        name: section.name,
        classId: section.classId,
        className: section.class.name,
        displayOrder: section.displayOrder,
        active: section.active,
      })),

      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  async create(
    schoolId: string,
    input: SectionFormOutput
  ) {
    const exists = await sectionRepository.findByName(
      schoolId,
      input.classId,
      input.name
    );

    if (exists) {
      throw new Error("Section already exists.");
    }

    return sectionRepository.create({
      name: input.name,
      displayOrder: input.displayOrder,

      class: {
        connect: {
          id: input.classId,
        },
      },
    });
  },

  async get(
    id: string,
    schoolId: string
  ) {
    const section = await sectionRepository.findById(
      id,
      schoolId
    );

    if (!section) {
      throw new Error("Section not found.");
    }

    return section;
  },

  async update(
    id: string,
    schoolId: string,
    input: SectionFormOutput
  ) {
    const section = await sectionRepository.findById(
      id,
      schoolId
    );

    if (!section) {
      throw new Error("Section not found.");
    }

    const duplicate = await sectionRepository.findByName(
      schoolId,
      input.classId,
      input.name
    );

    if (duplicate && duplicate.id !== id) {
      throw new Error("Section already exists.");
    }

    return sectionRepository.update(id, {
      name: input.name,
      displayOrder: input.displayOrder,

      class: {
        connect: {
          id: input.classId,
        },
      },
    });
  },
};