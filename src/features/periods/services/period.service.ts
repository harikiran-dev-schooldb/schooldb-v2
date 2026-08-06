import { Prisma } from "@/generated/prisma/client";

import { periodRepository } from "../repositories/period.repository";
import { PeriodFormOutput } from "../schemas/period.schema";

export const periodService = {
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

    const where: Prisma.PeriodWhereInput = {
      schoolId,

      ...(query.search && {
        OR: [
          {
            name: {
              contains: query.search,
              mode: "insensitive",
            },
          },
        ],
      }),
    };

    const [data, total] =
      await Promise.all([
        periodRepository.list(where, {
          skip,
          take: query.pageSize,
        }),

        periodRepository.count(where),
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
    const period =
      await periodRepository.get(
        id,
        schoolId
      );

    if (!period) {
      throw new Error(
        "Period not found."
      );
    }

    return period;
  },

  async create(
    schoolId: string,
    input: PeriodFormOutput
  ) {
    // Duplicate name
const duplicate =
  await periodRepository.findByName(
    schoolId,
    input.name
  );

if (duplicate) {
  throw new Error("Period already exists.");
}

// Duplicate display order
const duplicateOrder =
  await periodRepository.findByDisplayOrder(
    schoolId,
    input.displayOrder
  );

if (duplicateOrder) {
  throw new Error(
    "Display order already exists."
  );
}

// Overlapping time
const overlapping =
  await periodRepository.findOverlapping(
    schoolId,
    input.startTime,
    input.endTime
  );

if (overlapping.length > 0) {
  throw new Error(
    "This period overlaps with another period."
  );
}

    return periodRepository.create({
      school: {
        connect: {
          id: schoolId,
        },
      },

      ...input,
    });
  },

  async update(
    id: string,
    schoolId: string,
    input: PeriodFormOutput
  ) {
    // Duplicate name
const duplicate =
  await periodRepository.findByName(
    schoolId,
    input.name,
    id
  );

if (duplicate) {
  throw new Error("Period already exists.");
}

// Duplicate display order
const duplicateOrder =
  await periodRepository.findByDisplayOrder(
    schoolId,
    input.displayOrder,
    id
  );

if (duplicateOrder) {
  throw new Error(
    "Display order already exists."
  );
}

// Overlapping period
const overlapping =
  await periodRepository.findOverlapping(
    schoolId,
    input.startTime,
    input.endTime,
    id
  );

if (overlapping.length > 0) {
  throw new Error(
    "This period overlaps with another period."
  );
}

return periodRepository.update(
  id,
  schoolId,
  input
);
  },

  async options(schoolId: string) {
    const periods =
      await periodRepository.options(
        schoolId
      );

    return periods.map((item) => ({
      id: item.id,

      label: item.name,
    }));
  },

  
};