import { Prisma, StudentStatus } from "@/generated/prisma/client";
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

  findById(id: string, schoolId: string) {
  return prisma.student.findFirst({
    where: {
      id,
      schoolId,
    },
  });
},

  update(id: string, schoolId: string, data: Prisma.StudentUpdateInput) {
  return prisma.student.update({
    where: { id, schoolId },
    data,
  });
},

changeStatus(
  id: string,
  schoolId: string,
  status: StudentStatus,
  remarks?: string
) {
  return prisma.student.update({
    where: {
      id,
      schoolId,
    },

    data: {
      status,
      statusRemarks: remarks,
      statusChangedAt: new Date(),
    },
  });
}
};