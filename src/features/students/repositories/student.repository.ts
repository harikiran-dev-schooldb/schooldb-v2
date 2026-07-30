import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";


export const studentRepository = {
  findMany(where: Prisma.StudentWhereInput) {
    return prisma.student.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  findByAdmissionNo(schoolId: string, admissionNo: string) {
    return prisma.student.findFirst({
      where: {
        schoolId,
        admissionNo,
      },
    });
  },

  create(data: Prisma.StudentCreateInput) {
    return prisma.student.create({
      data,
    });
  },

  findById(id: string) {
    return prisma.student.findUnique({
      where: {
        id,
      },
    });
  },
};