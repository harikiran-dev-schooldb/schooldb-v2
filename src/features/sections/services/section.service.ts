import { Prisma } from "@/generated/prisma/client";

import { sectionRepository } from "../repositories/section.repository";
import { SectionFormOutput } from "../schemas/section.schema";

import { ListQuery } from "@/types/query";
import { classRepository } from "@/features/classes/repositories/class.repository";

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
    const cls = await classRepository.findById(input.classId, schoolId);

    if (!cls) {
      throw new Error("Class not found.");
    }

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

  const cls = await classRepository.findById(
    section.classId,
    schoolId
  );

  if (!cls) {
    throw new Error("Class not found.");
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

    async options(
    schoolId: string,
    classId: string
  ) {
    if (!classId) {
      throw new Error("classId is required.");
    }

    const cls = await classRepository.findById(
      classId,
      schoolId
    );

    if (!cls) {
      throw new Error("Class not found.");
    }

    const sections = await sectionRepository.options(
      schoolId,
      classId
    );

    return sections.map((item) => ({
      id: item.id,
      label: item.name,
    }));
  },
};
