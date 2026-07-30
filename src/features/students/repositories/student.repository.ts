import { prisma } from "@/lib/prisma";

export const studentRepository = {
  findMany(where: any) {
    return prisma.student.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  findById(id: string) {
    return prisma.student.findUnique({
      where: { id },
    });
  },

  create(data: any) {
    return prisma.student.create({
      data,
    });
  },

  update(id: string, data: any) {
    return prisma.student.update({
      where: { id },
      data,
    });
  },

  delete(id: string) {
    return prisma.student.delete({
      where: { id },
    });
  },

  count(where: any) {
    return prisma.student.count({
      where,
    });
  },
};