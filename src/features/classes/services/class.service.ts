import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
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

    const where: Prisma.ClassWhereInput = {
      schoolId,
      active: true,
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.syllabusId
        ? { branch: { syllabusId: query.syllabusId } }
        : {}),

      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" as const } },
          { branch: { name: { contains: query.search, mode: "insensitive" as const } } },
          { branch: { syllabus: { name: { contains: query.search, mode: "insensitive" as const } } } },
        ],
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
      data: data.map((item) => ({
        ...item,
        branchId: item.branchId,
        branchName: item.branch.name,
        syllabusId: item.branch.syllabusId,
        syllabusName: item.branch.syllabus.name,
      })),
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
    const branch = await prisma.academicBranch.findFirst({
      where: {
        id: input.branchId,
        syllabusId: input.syllabusId,
        schoolId,
        active: true,
      },
    });

    if (!branch) {
      throw new Error("Academic branch not found in the selected syllabus.");
    }

    const exists = await classRepository.findByName(
      input.name,
      input.branchId,
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
      branch: { connect: { id: input.branchId } },

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

  const branch = await prisma.academicBranch.findFirst({
    where: {
      id: input.branchId,
      syllabusId: input.syllabusId,
      schoolId,
      active: true,
    },
  });

  if (!branch) {
    throw new Error("Academic branch not found in the selected syllabus.");
  }

  const duplicate = await classRepository.findByName(
    input.name,
    input.branchId,
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
      branch: { connect: { id: input.branchId } },
    }
  );
},

async options(
  schoolId: string,
  filters?: { syllabusId?: string; branchId?: string; classIds?: string[] },
) {
  const classes = await classRepository.options(schoolId, filters);

  return classes.map((item) => ({
    id: item.id,
    label: item.name,
  }));
},
};
