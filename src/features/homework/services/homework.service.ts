import { Prisma } from "@/generated/prisma/client";

import {
  HomeworkFormOutput,
} from "../schemas/homework.schema";

import { homeworkRepository } from "../repositories/homework.repository";

export const homeworkService = {
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

    const where: Prisma.HomeworkWhereInput = {
      schoolId,

      ...(query.search && {
        OR: [
          {
            title: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            description: {
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
          {
            section: {
              name: {
                contains: query.search,
                mode: "insensitive",
              },
            },
          },
        ],
      }),
    };

    const [data, total] =
      await Promise.all([
        homeworkRepository.list(
          where,
          {
            skip,
            take: query.pageSize,
          }
        ),

        homeworkRepository.count(where),
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
    const homework =
      await homeworkRepository.get(
        id,
        schoolId
      );

    if (!homework) {
      throw new Error(
        "Homework not found."
      );
    }

    return homework;
  },

  async create(
    schoolId: string,
    input: HomeworkFormOutput
  ) {
    /*
     * Homework is assigned today by default.
     */
    const assignedDate = input.assignedDate
      ? new Date(input.assignedDate)
      : new Date();

    if (
      Number.isNaN(
        assignedDate.getTime()
      )
    ) {
      throw new Error(
        "Invalid assigned date."
      );
    }

    /*
     * Due date is optional.
     */
    let dueDate: Date | null = null;

    if (input.dueDate) {
      dueDate = new Date(
        input.dueDate
      );

      if (
        Number.isNaN(
          dueDate.getTime()
        )
      ) {
        throw new Error(
          "Invalid due date."
        );
      }

      if (dueDate < assignedDate) {
        throw new Error(
          "Due date cannot be before assigned date."
        );
      }
    }

    return homeworkRepository.create({
      school: {
        connect: {
          id: schoolId,
        },
      },

      class: {
        connect: {
          id: input.classId,
        },
      },

      ...(input.sectionId
        ? {
            section: {
              connect: {
                id: input.sectionId,
              },
            },
          }
        : {}),

      title: input.title,

      description:
        input.description || null,

      assignedDate,

      dueDate,

      active: input.active,
    });
  },

  async update(
    id: string,
    schoolId: string,
    input: HomeworkFormOutput
  ) {
    await this.get(
      id,
      schoolId
    );

    const assignedDate =
      input.assignedDate
        ? new Date(
            input.assignedDate
          )
        : new Date();

    if (
      Number.isNaN(
        assignedDate.getTime()
      )
    ) {
      throw new Error(
        "Invalid assigned date."
      );
    }

    let dueDate: Date | null = null;

    if (input.dueDate) {
      dueDate = new Date(
        input.dueDate
      );

      if (
        Number.isNaN(
          dueDate.getTime()
        )
      ) {
        throw new Error(
          "Invalid due date."
        );
      }

      if (dueDate < assignedDate) {
        throw new Error(
          "Due date cannot be before assigned date."
        );
      }
    }

    return homeworkRepository.update(
      id,
      schoolId,
      {
        class: {
          connect: {
            id: input.classId,
          },
        },

        /*
         * If section is selected,
         * connect it.
         *
         * If section is empty,
         * remove the existing section.
         */
        ...(input.sectionId
          ? {
              section: {
                connect: {
                  id: input.sectionId,
                },
              },
            }
          : {
              section: {
                disconnect: true,
              },
            }),

        title: input.title,

        description:
          input.description || null,

        assignedDate,

        dueDate,

        active: input.active,
      }
    );
  },

  async delete(
    id: string,
    schoolId: string
  ) {
    await this.get(
      id,
      schoolId
    );

    return homeworkRepository.delete(
      id,
      schoolId
    );
  },

  async options(
    schoolId: string
  ) {
    const rows =
      await homeworkRepository.options(
        schoolId
      );

    return rows.map((row) => ({
      id: row.id,
      label: row.title,
    }));
  },
};